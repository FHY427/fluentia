import { getAccent } from './data.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let cachedVoices = [];
let speakToken = 0;

function loadVoices() {
  if (!synth) return [];
  const voices = synth.getVoices() || [];
  if (voices.length) cachedVoices = voices;
  return cachedVoices;
}

if (synth) {
  loadVoices();
  if (typeof synth.addEventListener === 'function') {
    synth.addEventListener('voiceschanged', loadVoices);
  } else {
    synth.onvoiceschanged = loadVoices;
  }
}

export function getVoices() {
  return loadVoices();
}

export function getEnglishVoices() {
  const voices = loadVoices();
  return voices
    .filter((voice) => /^en(-|_)/i.test(voice.lang || ''))
    .sort((a, b) => (a.lang || '').localeCompare(b.lang || '') || a.name.localeCompare(b.name));
}

export function getChineseVoices() {
  return loadVoices().filter((voice) => /^zh(-|_)/i.test(voice.lang || ''));
}

function pickVoice(lang, voiceURI, hints = []) {
  const voices = loadVoices();
  if (!voices.length) return null;
  if (voiceURI && voiceURI !== 'auto') {
    const exact = voices.find((voice) => voice.voiceURI === voiceURI);
    const baseLang = (lang || 'en-US').slice(0, 2).toLowerCase();
    if (exact && (exact.lang || '').toLowerCase().startsWith(baseLang)) return exact;
  }
  const base = (lang || 'en-US').slice(0, 2).toLowerCase();
  const candidates = voices.filter((voice) => (voice.lang || '').toLowerCase().startsWith(base));
  if (!candidates.length) return voices.find((voice) => /^en/i.test(voice.lang || '')) || voices[0];
  for (const hint of hints) {
    const match = candidates.find((voice) => voice.name.toLowerCase().includes(hint.toLowerCase()));
    if (match) return match;
  }
  const local = candidates.find((voice) => voice.localService);
  return local || candidates[0];
}

function chunkText(text, max = 190) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= max) return [clean];
  const sentences = clean.match(/[^.!?。！？]+[.!?。！？]?/g) || [clean];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    const piece = sentence.trim();
    if (!piece) continue;
    if ((current + ' ' + piece).trim().length <= max) {
      current = `${current} ${piece}`.trim();
    } else {
      if (current) chunks.push(current);
      if (piece.length <= max) {
        current = piece;
      } else {
        const words = piece.split(' ');
        let line = '';
        for (const word of words) {
          if ((line + ' ' + word).trim().length <= max) line = `${line} ${word}`.trim();
          else {
            if (line) chunks.push(line);
            line = word;
          }
        }
        current = line;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function speakOne(text, { lang, rate, voiceURI, hints }) {
  return new Promise((resolve) => {
    if (!synth) {
      resolve(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(lang, voiceURI, hints);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || lang || 'en-US';
    utterance.rate = Math.min(1.5, Math.max(0.5, Number(rate) || 1));
    utterance.pitch = 1;
    utterance.volume = 1;
    let settled = false;
    let fallbackTimer = null;
    const done = (value) => {
      if (settled) return;
      settled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      resolve(value);
    };
    utterance.onend = () => done(true);
    utterance.onerror = () => done(false);
    fallbackTimer = setTimeout(() => done(true), Math.max(4200, Math.min(30_000, text.length * 110 + 1800)));
    try {
      synth.resume();
      synth.speak(utterance);
    } catch {
      done(false);
    }
  });
}

export const tts = {
  supported: Boolean(synth),

  cancel() {
    speakToken += 1;
    if (!synth) return;
    try {
      synth.cancel();
    } catch {
      /* ignore */
    }
  },

  async speakParts(parts, { rate = 1, voiceURI = 'auto', onStart } = {}) {
    if (!synth) return false;
    this.cancel();
    const token = ++speakToken;
    const usable = (parts || []).filter((part) => part && String(part.text || '').trim());
    if (!usable.length) return false;

    if (onStart) onStart();
    for (const part of usable) {
      if (token !== speakToken) return false;
      const lang = part.lang || 'en-US';
      const hints = part.hints || getAccent(part.accent || 'us').voiceHints || [];
      const chunks = chunkText(part.text);
      for (const chunk of chunks) {
        if (token !== speakToken) return false;
        const completed = await speakOne(chunk, { lang, rate, voiceURI, hints });
        if (!completed || token !== speakToken) return false;
      }
    }
    return token === speakToken;
  },

  speak(text, { lang = 'en-US', rate = 1, voiceURI = 'auto', onStart } = {}) {
    return this.speakParts([{ text, lang }], { rate, voiceURI, onStart });
  }
};

const SpeechRecognitionCtor =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

class RecognitionManager {
  constructor() {
    this.recognition = null;
    this.active = false;
    this.finalText = '';
    this.interimText = '';
    this.discard = false;
    this.handlers = null;
    this.errorCode = '';
  }

  get supported() {
    return Boolean(SpeechRecognitionCtor);
  }

  start({ lang = 'en-US', onInterim, onFinal, onError, onEnd, onStart } = {}) {
    if (!this.supported) {
      onError?.('unsupported');
      onEnd?.('');
      return false;
    }
    this.abort();
    this.finalText = '';
    this.interimText = '';
    this.discard = false;
    this.errorCode = '';
    this.handlers = { onInterim, onFinal, onError, onEnd, onStart };

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    this.recognition = recognition;

    recognition.onstart = () => {
      this.active = true;
      onStart?.();
    };

    recognition.onresult = (event) => {
      let finalPiece = '';
      let interimPiece = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript || '';
        if (result.isFinal) finalPiece += `${transcript} `;
        else interimPiece += transcript;
      }
      if (finalPiece) this.finalText = `${this.finalText} ${finalPiece}`.trim();
      if (interimPiece) this.interimText = interimPiece;
      const visible = `${this.finalText} ${this.interimText}`.trim();
      onInterim?.(visible);
      if (finalPiece) onFinal?.(this.finalText);
    };

    recognition.onerror = (event) => {
      this.errorCode = event?.error || 'unknown';
      if (this.errorCode === 'no-speech' || this.errorCode === 'aborted') return;
      onError?.(this.errorCode);
    };

    recognition.onend = () => {
      this.active = false;
      const text = this.finalText.trim();
      if (!this.discard) {
        onEnd?.(text, { error: this.errorCode, discarded: false });
      } else {
        onEnd?.('', { error: this.errorCode, discarded: true });
      }
      this.recognition = null;
    };

    try {
      recognition.start();
      return true;
    } catch {
      this.active = false;
      onError?.('start-failed');
      onEnd?.('', { error: 'start-failed' });
      return false;
    }
  }

  stop() {
    this.discard = false;
    if (this.recognition && this.active) {
      try {
        this.recognition.stop();
      } catch {
        /* ignore */
      }
    }
  }

  abort() {
    this.discard = true;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        /* ignore */
      }
    }
    this.recognition = null;
    this.active = false;
  }
}

export const stt = new RecognitionManager();

export const SPEECH_ERRORS = {
  unsupported: 'This browser does not support live speech recognition. Use Chrome or Edge, or type your reply.',
  'not-allowed': 'Microphone access was blocked. Allow it in the address bar, then try again.',
  'service-not-allowed': 'Speech recognition is blocked by the browser. Try Chrome or Edge on localhost.',
  'no-speech': 'I did not catch anything. Try again a little closer to the mic.',
  'audio-capture': 'No microphone was found. Check your device, or type your reply.',
  network: 'Speech recognition needs a network connection in this browser. You can still type.',
  aborted: 'Listening stopped.',
  'start-failed': 'The microphone could not start. Try again, or type your reply.',
  unknown: 'Speech recognition had a problem. You can try again or type your reply.'
};
