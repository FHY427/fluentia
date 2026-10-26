import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { networkInterfaces } from 'node:os';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');
const PORT = Number(process.env.PORT || 8090);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const SITE_USER = process.env.SITE_USER || '';
const SITE_PASSWORD = process.env.SITE_PASSWORD || '';
const AUTH_ENABLED = Boolean(SITE_USER && SITE_PASSWORD);
const RATE_LIMIT_ENV = process.env.RATE_LIMIT_PER_MINUTE;
const RATE_LIMIT = RATE_LIMIT_ENV === undefined ? 60 : Math.max(0, Number(RATE_LIMIT_ENV) || 0);
const PRIVATE_ENV = process.env.ALLOW_PRIVATE_ENDPOINTS;
const ALLOW_PRIVATE_ENDPOINTS = PRIVATE_ENV
  ? !/^(0|false|no)$/i.test(PRIVATE_ENV)
  : process.env.NODE_ENV !== 'production';

const rateBuckets = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

function sendJSON(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left), 'utf8');
  const b = Buffer.from(String(right), 'utf8');
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function isAuthorized(req) {
  if (!AUTH_ENABLED) return true;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  let decoded = '';
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return false;
  }
  const split = decoded.indexOf(':');
  if (split < 0) return false;
  return safeEqual(decoded.slice(0, split), SITE_USER) && safeEqual(decoded.slice(split + 1), SITE_PASSWORD);
}

function requestAuth(res) {
  const body = '<!doctype html><meta charset="utf-8"><title>Fluentia · Private</title><style>body{font-family:system-ui;background:#f3eee3;color:#15231c;display:grid;place-items:center;height:100vh;margin:0}main{max-width:420px;padding:32px;background:#fffdf8;border:1px solid rgba(21,35,28,.12);border-radius:24px}h1{font-family:Georgia,serif;font-size:42px;line-height:1;margin:0 0 12px}p{color:#6b776e;font-size:14px;line-height:1.7}</style><main><h1>This room is private.</h1><p>Enter the username and password your host shared with you to open Fluentia.</p></main>';
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="Fluentia", charset="UTF-8"',
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf.trim()) return cf.trim();
  return req.socket.remoteAddress || 'unknown';
}

function rateLimited(req) {
  if (!RATE_LIMIT) return false;
  const now = Date.now();
  const key = clientIp(req);
  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.reset <= now) {
    bucket = { count: 0, reset: now + 60_000 };
    rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (rateBuckets.size > 5000) {
    for (const [bucketKey, value] of rateBuckets) {
      if (value.reset <= now) rateBuckets.delete(bucketKey);
    }
  }
  return bucket.count > RATE_LIMIT;
}

function sendRateLimit(res) {
  const body = JSON.stringify({ error: 'Too many model requests. Wait a minute and try again.' });
  res.writeHead(429, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'Retry-After': '60'
  });
  res.end(body);
}

function privateHostname(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (host === 'metadata.google.internal') return true;
  if (isIP(host) === 4) {
    const [a, b] = host.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 224) return true;
    return false;
  }
  if (isIP(host) === 6) {
    if (host === '::1' || host === '::') return true;
    if (host.startsWith('fc') || host.startsWith('fd')) return true;
    if (host.startsWith('fe8') || host.startsWith('fe9') || host.startsWith('fea') || host.startsWith('feb')) return true;
    const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return privateHostname(mapped[1]);
    return false;
  }
  return false;
}

async function assertEndpointAllowed(endpoint) {
  if (ALLOW_PRIVATE_ENDPOINTS) return;
  const url = new URL(endpoint);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (privateHostname(host)) {
    throw new Error('Private or local model endpoints are disabled on this deployment.');
  }
  let addresses;
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error('The model host could not be resolved.');
  }
  if (!addresses.length || addresses.some((entry) => privateHostname(entry.address))) {
    throw new Error('Private or local model endpoints are disabled on this deployment.');
  }
}

function readBody(req) {
  return new Promise((resolvePromise, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolvePromise(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function normaliseBaseUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('A model API base URL is required.');
  }
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('The model API base URL is not a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('The model API base URL must start with http:// or https://.');
  }
  url.hash = '';
  url.search = '';
  let path = url.pathname.replace(/\/+$/, '');
  if (path.endsWith('/chat/completions')) {
    // Already a complete endpoint.
  } else if (path.endsWith('/v1') || path.endsWith('/v4')) {
    path += '/chat/completions';
  } else if (!path) {
    path = '/v1/chat/completions';
  } else {
    path += '/chat/completions';
  }
  url.pathname = path;
  return url.toString();
}

async function callUpstream(endpoint, headers, payload) {
  return fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(75_000)
  });
}

async function proxyChat(req, res) {
  let input;
  try {
    input = await readBody(req);
  } catch (error) {
    sendJSON(res, 400, { error: error.message });
    return;
  }

  const {
    baseUrl,
    apiKey,
    model,
    messages,
    temperature = 0.8,
    responseFormat = null,
    maxTokens = 900
  } = input || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    sendJSON(res, 400, { error: 'At least one chat message is required.' });
    return;
  }
  if (typeof model !== 'string' || !model.trim()) {
    sendJSON(res, 400, { error: 'A model name is required.' });
    return;
  }

  let endpoint;
  try {
    endpoint = normaliseBaseUrl(baseUrl);
  } catch (error) {
    sendJSON(res, 400, { error: error.message });
    return;
  }

  try {
    await assertEndpointAllowed(endpoint);
  } catch (error) {
    sendJSON(res, 403, { error: error.message });
    return;
  }

  const payload = {
    model: model.trim(),
    messages,
    temperature: Math.min(2, Math.max(0, Number(temperature) || 0.8)),
    max_tokens: Math.min(4096, Math.max(64, Number(maxTokens) || 900)),
    stream: false
  };
  if (responseFormat === 'json_object') {
    payload.response_format = { type: 'json_object' };
  }

  const headers = { 'Content-Type': 'application/json' };
  if (typeof apiKey === 'string' && apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  let upstream;
  try {
    upstream = await callUpstream(endpoint, headers, payload);
    // Some OpenAI-compatible providers do not implement response_format.
    if (!upstream.ok && upstream.status === 400 && payload.response_format) {
      delete payload.response_format;
      upstream = await callUpstream(endpoint, headers, payload);
    }
  } catch (error) {
    const code = error?.cause?.code || error?.code || '';
    let message;
    if (error?.name === 'TimeoutError') {
      message = 'The model provider timed out. Try again or choose a faster model.';
    } else if (code === 'ECONNREFUSED') {
      message = 'The model endpoint refused the connection. Check the Base URL and make sure the server is running.';
    } else if (code === 'ENOTFOUND') {
      message = 'The model host could not be found. Check the Base URL for a typo.';
    } else if (code === 'CERT_HAS_EXPIRED' || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      message = 'The model endpoint has an SSL certificate problem. Check the Base URL.';
    } else {
      message = `Could not reach the model provider${code ? ` (${code})` : ''}. Check your network and Base URL.`;
    }
    sendJSON(res, 502, { error: message });
    return;
  }

  const raw = await upstream.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    // Keep the raw text for a useful error below.
  }

  if (!upstream.ok) {
    const providerMessage =
      data?.error?.message ||
      data?.message ||
      raw?.slice(0, 400) ||
      `The provider returned HTTP ${upstream.status}.`;
    sendJSON(res, upstream.status, { error: providerMessage });
    return;
  }

  const choice = data?.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    const reason = choice?.finish_reason ? ` (finish reason: ${choice.finish_reason})` : '';
    sendJSON(res, 502, {
      error: `The model returned an empty response${reason}. Check the model name and try again.`
    });
    return;
  }

  sendJSON(res, 200, {
    content,
    model: data?.model || model,
    usage: data?.usage || null
  });
}

async function serveStatic(req, res, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  if (decoded === '/') decoded = '/index.html';
  const filePath = resolve(PUBLIC_DIR, `.${decoded}`);
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('Not a file');
    const body = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': ext === '.html' ? 'no-store' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'microphone=(self)',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; media-src 'self' blob:; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    });
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(body);
    }
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('ok');
    return;
  }

  if (url.pathname === '/api/health') {
    sendJSON(res, 200, { ok: true, app: 'fluentia', now: new Date().toISOString() });
    return;
  }

  if (!isAuthorized(req)) {
    if (url.pathname === '/api/chat') {
      sendJSON(res, 401, { error: 'Authentication required. Refresh the page and enter the site password.' });
    } else {
      requestAuth(res);
    }
    return;
  }

  if (url.pathname === '/api/chat') {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { error: 'Use POST for /api/chat.' });
      return;
    }
    if (rateLimited(req)) {
      sendRateLimit(res);
      return;
    }
    await proxyChat(req, res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed');
    return;
  }

  await serveStatic(req, res, url.pathname);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try: PORT=8091 npm start`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  const localUrl = `http://localhost:${PORT}`;
  const lanIps = Object.values(networkInterfaces())
    .flat()
    .filter((item) => item && item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);

  console.log('');
  console.log('  Fluentia is running');
  console.log(`  Local:    ${localUrl}`);
  if (HOST === '0.0.0.0' && lanIps.length) {
    console.log(`  Network:  ${lanIps.map((ip) => `http://${ip}:${PORT}`).join('  ')}`);
  }
  console.log(`  Access:   ${AUTH_ENABLED ? 'password protected' : 'open (no SITE_USER / SITE_PASSWORD)'}`);
  console.log(`  Rate:     ${RATE_LIMIT ? `${RATE_LIMIT} model requests / minute / IP` : 'disabled'}`);
  console.log(`  Endpoints:${ALLOW_PRIVATE_ENDPOINTS ? ' private/local allowed' : ' public endpoints only'}`);
  console.log('  Speech:   Chrome or Edge on localhost / HTTPS');
  console.log('  Model:    connect your own OpenAI-compatible API in Settings');
  if (!AUTH_ENABLED && HOST !== '127.0.0.1' && HOST !== 'localhost') {
    console.warn('  Warning:  this server is reachable beyond this machine and has no password.');
  }
  if (Boolean(SITE_USER) !== Boolean(SITE_PASSWORD)) {
    console.warn('  Warning:  set BOTH SITE_USER and SITE_PASSWORD to enable access control.');
  }
  console.log('');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
