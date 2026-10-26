import { getAccent, getDifficulty } from './data.js';

export const PROVIDERS = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    cn: '深度求索',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    note: 'Fast and affordable. Great for natural conversation.'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    cn: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    note: 'Reliable instruction-following and JSON output.'
  },
  {
    id: 'moonshot',
    name: 'Moonshot',
    cn: '月之暗面',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    note: 'Good Chinese/English handling, accessible in China.'
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    cn: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    note: 'Hosts many open models behind one API.'
  },
  {
    id: 'zhipu',
    name: 'Zhipu',
    cn: '智谱 AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    note: 'OpenAI-compatible endpoint for GLM models.'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    cn: '聚合路由',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
    note: 'One key for many providers and models.'
  },
  {
    id: 'custom',
    name: 'Custom',
    cn: '自定义',
    baseUrl: '',
    model: '',
    note: 'Any OpenAI-compatible endpoint, including a local Ollama server.'
  }
];

const REPLY_SCHEMA = `{
  "reply": "your in-character English reply, or the Chinese explanation when help_mode is true",
  "translation": "a natural Simplified Chinese translation of reply; empty string when help_mode is true",
  "followup": "one simple English sentence to resume the scene; only when help_mode is true, otherwise empty string",
  "coach": null,
  "suggestions": ["short English phrase the learner could say next", "another option", "a third option"]
}`;

const COACH_SCHEMA = `{
  "original": "the learner's exact phrase",
  "better": "a natural, idiomatic rewrite",
  "why": "one short sentence in Simplified Chinese explaining the improvement"
}`;

function sceneLine(scene, key, fallback = '') {
  return String(scene?.[key] || fallback).trim();
}

export function buildSystemPrompt(scene, config, settings, helpMode) {
  const difficulty = getDifficulty(config.difficulty);
  const accent = getAccent(config.accent);
  const displayName = settings.displayName?.trim() || 'the learner';
  const goals = (scene.goals || []).map((goal) => `- ${goal}`).join('\n');
  const phrases = (scene.phrases || []).map((phrase) => `- ${phrase.en}`).join('\n');
  const coachRule =
    config.coach === 'detailed'
      ? 'Give a correction whenever there is a clear grammar, word-choice or naturalness issue. Keep it short and never more than one correction per turn.'
      : 'Only give a correction when the issue would genuinely confuse a native speaker or is a repeated pattern. Otherwise return null. Do not nitpick.';

  const turnDirective = helpMode
    ? `help_mode = true. The learner pressed the Chinese lifeline and is asking for help. In "reply", answer in clear, simple Simplified Chinese (2–4 sentences). Do not role-play in Chinese and do not lecture. Explain the meaning, the key phrase, or the grammar they asked about. In "followup", give exactly one easy English sentence that returns them to the scene. Set "translation" to an empty string.`
    : `help_mode = false. Stay fully in English in "reply". Never use Chinese in "reply", not even a parenthetical translation. Keep the role-play alive.`;

  return `You are ${sceneLine(scene, 'aiName', 'Alex')}, ${sceneLine(scene, 'aiRole', 'a friendly conversation partner')}.
You are a native ${accent.label} English speaker with this personality: ${sceneLine(scene, 'personality', 'warm, curious and patient')}.

THE SCENE
${sceneLine(scene, 'setting')}

The learner is ${sceneLine(scene, 'userRole', 'your conversation partner')}. Their name: ${displayName}. Their English level: ${difficulty.label} (${difficulty.cn}). ${difficulty.prompt}

SCENE GOALS
${goals || '- Have a natural conversation'}

USEFUL LANGUAGE THE LEARNER MAY TRY
${phrases || '- Anything they can manage'}

HOW TO TALK
1. Sound like a real person, not a language textbook or a teacher. Use contractions, natural rhythm, short reactions and the occasional idiom.
2. Keep each turn to 1–3 sentences. Most turns should end with a genuine question or a hook that makes it easy to answer.
3. React to what the learner actually said. Reference a specific detail. Never give a generic "That's great!" unless it fits.
4. If the learner gives a one-word answer, make it easy: offer two options or ask a small, concrete question. Do not interrogate them.
5. Stay in character. Never mention being an AI, a model, a prompt or a language exercise. Never describe the scene from outside.
6. Do not correct the learner inside "reply". Corrections belong only in "coach".
7. ${coachRule}
8. "suggestions" must be 2–3 short, natural English things the learner could actually say next. They should fit the conversation, not be generic study phrases.
9. If the learner writes in Chinese during a normal turn, do not switch languages. Gently invite them to try in English, and keep the scene moving.
10. Never break the learner's immersion by explaining vocabulary unless help_mode is true.

CURRENT TURN
${turnDirective}

OUTPUT
Return ONLY a valid JSON object. No markdown, no code fences, no commentary. Use exactly these keys:
${REPLY_SCHEMA}
"coach" must be null or an object shaped like:
${COACH_SCHEMA}`;
}

function parseJsonLoose(text) {
  if (typeof text !== 'string') return null;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* try extracting an object */
  }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

function cleanString(value, max = 1200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function normaliseReply(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const reply =
    cleanString(data.reply, 1800) ||
    cleanString(data.message, 1800) ||
    cleanString(data.content, 1800) ||
    cleanString(data.text, 1800);

  let coach = null;
  if (data.coach && typeof data.coach === 'object') {
    const original = cleanString(data.coach.original, 300);
    const better = cleanString(data.coach.better, 300);
    const why = cleanString(data.coach.why ?? data.coach.why_zh, 300);
    if (original && better) coach = { original, better, why };
  }

  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions.map((item) => cleanString(item, 140)).filter(Boolean).slice(0, 3)
    : [];

  return {
    reply,
    translation: cleanString(data.translation, 900),
    followup: cleanString(data.followup, 600),
    coach,
    suggestions
  };
}

async function callProxy(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 85_000);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      throw new Error(`The local model gateway returned an unreadable response (HTTP ${response.status}).`);
    }
    if (!response.ok) {
      throw new Error(data?.error || `The model request failed (HTTP ${response.status}).`);
    }
    if (!data?.content) throw new Error('The model returned no content.');
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The model took too long to respond. Try a shorter message or a faster model.');
    }
    if (error instanceof TypeError) {
      throw new Error('The local server is not responding. Make sure it is still running.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function historyToMessages(session) {
  return (session.messages || [])
    .filter((message) => message && message.text && message.role !== 'system')
    .slice(-18)
    .map((message) => {
      if (message.role === 'assistant') {
        if (message.kind === 'help') {
          return {
            role: 'assistant',
            content: `[Chinese lifeline explanation] ${message.text}\n[English follow-up] ${message.followup || ''}`.trim()
          };
        }
        return { role: 'assistant', content: message.text.slice(0, 1600) };
      }
      if (message.kind === 'help') {
        return { role: 'user', content: `[Chinese lifeline request] ${message.text}`.slice(0, 1200) };
      }
      return { role: 'user', content: message.text.slice(0, 1600) };
    });
}

export async function requestReply({ session, scene, config, settings, helpMode }) {
  const latest = [...session.messages].reverse().find((message) => message.role === 'user');
  const helpText = helpMode ? latest?.text?.trim() : '';
  const directive = helpMode
    ? `The learner's Chinese help request: "${helpText || '请用中文解释你刚才那句话的意思，并给我一个简单的英文回答提示。'}" — answer this now.`
    : 'Continue the scene naturally from the learner\'s latest message.';

  const messages = [
    { role: 'system', content: buildSystemPrompt(scene, config, settings, helpMode) },
    ...historyToMessages(session),
    { role: 'system', content: `TURN DIRECTIVE: ${directive}` }
  ];

  const data = await callProxy({
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    messages,
    temperature: Math.min(1.2, Math.max(0.2, Number(settings.temperature) || 0.8)),
    responseFormat: 'json_object',
    maxTokens: helpMode ? 700 : 850
  });

  const parsed = parseJsonLoose(data.content);
  if (!parsed) {
    const fallback = cleanString(data.content, 1800);
    if (!fallback) throw new Error('The model returned an empty reply.');
    return {
      reply: fallback,
      translation: '',
      followup: '',
      coach: null,
      suggestions: []
    };
  }
  const normalised = normaliseReply(parsed);
  if (!normalised.reply) throw new Error('The model did not include a usable reply.');
  return normalised;
}

function transcriptForReport(session) {
  const lines = [];
  for (const message of session.messages || []) {
    if (!message.text) continue;
    const stamp = message.ts ? new Date(message.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
    if (message.role === 'assistant') {
      if (message.kind === 'help') {
        lines.push(`[${stamp}] Partner (Chinese help): ${message.text}${message.followup ? ` / English follow-up: ${message.followup}` : ''}`);
      } else {
        lines.push(`[${stamp}] Partner: ${message.text}`);
      }
    } else {
      lines.push(`[${stamp}] Learner: ${message.text}`);
    }
  }
  return lines.join('\n').slice(0, 14_000);
}

function clampScore(value, fallback = 70) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function stringList(value, limit = 6) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, limit);
}

export async function requestReport({ session, settings }) {
  const scene = session.scene;
  const difficulty = getDifficulty(session.config.difficulty);
  const duration = Math.max(1, Math.round((session.stats?.durationSeconds || 0) / 60));
  const transcript = transcriptForReport(session);
  if (!transcript.trim()) throw new Error('There is no conversation to analyse yet.');

  const system = `You are a warm, precise English speaking coach reviewing a practice conversation.
Analyse the learner's English, not the partner's. The learner's level is ${difficulty.label} (${difficulty.cn}).
Be encouraging but honest. Do not invent mistakes that are not in the transcript. Use simplified Chinese for all feedback fields, while keeping example phrases in English.

Return ONLY valid JSON:
{
  "headline_zh": "short, specific headline, max 18 Chinese characters",
  "summary_zh": "2-3 sentences in Chinese about how the conversation went",
  "scores": {
    "fluency": 0-100,
    "vocabulary": 0-100,
    "grammar": 0-100,
    "confidence": 0-100
  },
  "wins": ["specific thing the learner did well, in Chinese, max 2"],
  "focus": ["specific next step, in Chinese, max 2"],
  "corrections": [
    {
      "original": "exact learner phrase",
      "better": "natural English rewrite",
      "why_zh": "one short Chinese sentence"
    }
  ],
  "phrases": [
    { "en": "a useful English phrase from or for this conversation", "zh": "Chinese meaning" }
  ]
}
Calibrate scores to the learner's level. Grammar should reflect actual errors. Confidence reflects willingness to extend answers, not volume alone. Include 2-5 corrections and 3-5 phrases. If the learner only wrote very little, say so kindly and score accordingly.`;

  const userPrompt = `SCENE: ${scene?.title || 'Conversation'} — ${scene?.setting || ''}
USER ROLE: ${scene?.userRole || 'learner'}
PARTNER: ${scene?.aiName || 'partner'}, ${scene?.aiRole || ''}
DURATION: ${duration} minutes
TURNS: ${session.stats?.turns || 0}
LEARNER WORDS: ${session.stats?.userWords || 0}

TRANSCRIPT
${transcript}`;

  const data = await callProxy({
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.35,
    responseFormat: 'json_object',
    maxTokens: 1300
  });

  const parsed = parseJsonLoose(data.content);
  if (!parsed) throw new Error('The model did not return a usable report.');

  const scores = {
    fluency: clampScore(parsed.scores?.fluency),
    vocabulary: clampScore(parsed.scores?.vocabulary),
    grammar: clampScore(parsed.scores?.grammar),
    confidence: clampScore(parsed.scores?.confidence)
  };
  const overall = Math.round((scores.fluency + scores.vocabulary + scores.grammar + scores.confidence) / 4);

  const corrections = Array.isArray(parsed.corrections)
    ? parsed.corrections
        .map((item) => ({
          original: cleanString(item?.original, 260),
          better: cleanString(item?.better, 260),
          why_zh: cleanString(item?.why_zh ?? item?.why, 260)
        }))
        .filter((item) => item.original && item.better)
        .slice(0, 6)
    : [];

  const phrases = Array.isArray(parsed.phrases)
    ? parsed.phrases
        .map((item) => ({
          en: cleanString(item?.en, 220),
          zh: cleanString(item?.zh, 220)
        }))
        .filter((item) => item.en)
        .slice(0, 6)
    : [];

  return {
    source: 'ai',
    overall,
    scores,
    headline: cleanString(parsed.headline_zh, 80) || 'A real conversation, finished.',
    summary: cleanString(parsed.summary_zh, 900),
    wins: stringList(parsed.wins, 3),
    focus: stringList(parsed.focus, 3),
    corrections,
    phrases,
    generatedAt: new Date().toISOString()
  };
}

export async function testConnection(settings) {
  const data = await callProxy({
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    messages: [
      { role: 'system', content: 'You are a connection test. Reply with exactly: OK' },
      { role: 'user', content: 'Say OK.' }
    ],
    temperature: 0,
    maxTokens: 24
  });
  return cleanString(data.content, 120);
}
