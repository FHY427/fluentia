import { DEFAULT_CONFIG } from './data.js';

const KEYS = {
  settings: 'fluentia.settings.v1',
  sessions: 'fluentia.sessions.v1',
  vocab: 'fluentia.vocab.v1',
  custom: 'fluentia.custom.v1',
  draft: 'fluentia.draft.v1'
};

const SETTINGS_DEFAULTS = {
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat',
  temperature: 0.8,
  accent: 'us',
  pace: 'natural',
  voiceURI: 'auto',
  autoSpeak: true,
  displayName: '',
  lastConfig: { ...DEFAULT_CONFIG }
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function dayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export const store = {
  getSettings() {
    const saved = read(KEYS.settings, {});
    return {
      ...SETTINGS_DEFAULTS,
      ...saved,
      lastConfig: { ...SETTINGS_DEFAULTS.lastConfig, ...(saved.lastConfig || {}) }
    };
  },

  saveSettings(patch) {
    const next = { ...this.getSettings(), ...patch };
    write(KEYS.settings, next);
    return next;
  },

  isConfigured(settings = this.getSettings()) {
    if (settings.apiKey && settings.apiKey.trim()) return true;
    return /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(settings.baseUrl || '');
  },

  getSessions() {
    const sessions = read(KEYS.sessions, []);
    return Array.isArray(sessions) ? sessions.filter((item) => item && item.id) : [];
  },

  getSession(id) {
    return this.getSessions().find((session) => session.id === id) || null;
  },

  saveSession(session) {
    if (!session || !session.id) return null;
    const sessions = this.getSessions();
    const index = sessions.findIndex((item) => item.id === session.id);
    if (index >= 0) sessions[index] = session;
    else sessions.unshift(session);
    sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    write(KEYS.sessions, sessions.slice(0, 80));
    return session;
  },

  deleteSession(id) {
    const sessions = this.getSessions().filter((session) => session.id !== id);
    write(KEYS.sessions, sessions);
  },

  getDraft() {
    const draft = read(KEYS.draft, null);
    if (!draft || !draft.id || !Array.isArray(draft.messages)) return null;
    return draft;
  },

  saveDraft(session) {
    if (!session) return;
    write(KEYS.draft, session);
  },

  clearDraft() {
    remove(KEYS.draft);
  },

  getVocab() {
    const items = read(KEYS.vocab, []);
    return Array.isArray(items) ? items.filter((item) => item && item.en) : [];
  },

  addVocab(items, source = 'Conversation') {
    const existing = this.getVocab();
    const seen = new Set(existing.map((item) => item.en.trim().toLowerCase()));
    const added = [];
    for (const item of items || []) {
      const en = String(item?.en || '').trim();
      if (!en) continue;
      const key = en.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      added.push({
        id: uid('v'),
        en,
        zh: String(item?.zh || '').trim(),
        source,
        addedAt: new Date().toISOString()
      });
    }
    if (added.length) write(KEYS.vocab, [...added, ...existing]);
    return added.length;
  },

  removeVocab(id) {
    write(
      KEYS.vocab,
      this.getVocab().filter((item) => item.id !== id)
    );
  },

  getCustomScenes() {
    const items = read(KEYS.custom, []);
    return Array.isArray(items) ? items.filter((item) => item && item.id && item.isCustom) : [];
  },

  saveCustomScene(scene) {
    if (!scene || !scene.id) return;
    const items = this.getCustomScenes();
    const index = items.findIndex((item) => item.id === scene.id);
    if (index >= 0) items[index] = scene;
    else items.unshift(scene);
    write(KEYS.custom, items.slice(0, 24));
  },

  removeCustomScene(id) {
    write(
      KEYS.custom,
      this.getCustomScenes().filter((item) => item.id !== id)
    );
  },

  getProgress() {
    const sessions = this.getSessions().filter((session) => session.endedAt);
    const totalSeconds = sessions.reduce((sum, session) => sum + (session.stats?.durationSeconds || 0), 0);
    const totalWords = sessions.reduce((sum, session) => sum + (session.stats?.userWords || 0), 0);
    const totalTurns = sessions.reduce((sum, session) => sum + (session.stats?.turns || 0), 0);

    const days = new Set(
      sessions
        .map((session) => (session.startedAt ? dayKey(new Date(session.startedAt)) : ''))
        .filter(Boolean)
    );

    let cursor = new Date();
    if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);
    let streak = 0;
    while (days.has(dayKey(cursor))) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }

    const week = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = addDays(new Date(), -offset);
      const key = dayKey(date);
      const minutes = sessions
        .filter((session) => dayKey(new Date(session.startedAt)) === key)
        .reduce((sum, session) => sum + (session.stats?.durationSeconds || 0) / 60, 0);
      week.push({
        date: key,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        minutes: Math.round(minutes * 10) / 10
      });
    }

    const scored = sessions.filter((session) => typeof session.report?.overall === 'number');
    const averageScore = scored.length
      ? Math.round(scored.reduce((sum, session) => sum + session.report.overall, 0) / scored.length)
      : null;

    return {
      sessions: sessions.length,
      totalSeconds,
      totalMinutes: Math.round(totalSeconds / 60),
      totalWords,
      totalTurns,
      streak,
      week,
      averageScore,
      latest: sessions[0] || null
    };
  },

  exportAll() {
    return {
      app: 'fluentia',
      exportedAt: new Date().toISOString(),
      settings: { ...this.getSettings(), apiKey: '' },
      sessions: this.getSessions(),
      vocab: this.getVocab(),
      customScenes: this.getCustomScenes()
    };
  },

  clearAll() {
    for (const key of Object.values(KEYS)) remove(key);
  }
};
