import {
  ACCENTS,
  CUSTOM_PRESETS,
  DEFAULT_CONFIG,
  DIFFICULTIES,
  DURATIONS,
  OPENERS,
  PACES,
  SCENES,
  SUBTITLE_MODES,
  WORLDS,
  buildCustomScene,
  getAccent,
  getDifficulty,
  getPace,
  getSubtitle,
  getWorld
} from './data.js';
import { PROVIDERS, testConnection } from './api.js';
import { worldArt } from './art.js';
import { icon } from './icons.js';
import { getEnglishVoices, stt, tts } from './speech.js';
import { store } from './store.js';
import {
  confirmDialog,
  esc,
  formatDate,
  formatMinutes,
  openModal,
  scoreLabel,
  scoreTone,
  spinner,
  timeAgo,
  toast
} from './ui.js';
import { mountRoom } from './chat.js';
import { renderReport } from './report.js';

const app = document.getElementById('app');

const state = {
  settings: store.getSettings(),
  session: null,
  room: null,
  cleanupRoom: null,
  lastRoute: '',
  reportId: null
};

function customScenes() {
  return store.getCustomScenes();
}

function allScenes() {
  return [...SCENES, ...customScenes()];
}

function findScene(id) {
  return allScenes().find((scene) => scene.id === id) || null;
}

function navigate(hash) {
  const next = `#/${hash.replace(/^#?\/?/, '')}`;
  if (location.hash === next) {
    renderRoute();
  } else {
    location.hash = next;
  }
}

function parseRoute() {
  const raw = (location.hash || '#/').replace(/^#\/?/, '');
  const [path, param] = raw.split('/');
  if (path === 'room') return { name: 'room' };
  if (path === 'report' && param) return { name: 'report', id: decodeURIComponent(param) };
  if (path === 'history') return { name: 'history' };
  if (path === 'vocab') return { name: 'vocab' };
  return { name: 'home' };
}

function brandMarkup() {
  return `<span class="brand-mark" aria-hidden="true">
    <svg viewBox="0 0 34 34" fill="none"><path d="M6 12.5C6 8.9 8.9 6 12.5 6h9C25.1 6 28 8.9 28 12.5v5c0 3.6-2.9 6.5-6.5 6.5H16l-6 5v-5.4A6.5 6.5 0 0 1 6 17.5v-5Z" fill="currentColor"/><circle cx="23.5" cy="23.5" r="4" fill="#e46a4f"/></svg>
  </span><span class="brand-word">fluentia<span class="brand-dot">.</span></span>`;
}

function apiPillMarkup() {
  const configured = store.isConfigured(state.settings);
  const model = state.settings.model || 'your model';
  return `<button class="api-pill ${configured ? 'is-live' : ''}" data-open-settings aria-label="${
    configured ? 'AI model connected. Open settings' : 'Demo mode. Connect your AI model'
  }">
    <span class="api-dot"></span>
    <span class="api-pill-copy">
      <strong>${configured ? 'AI ready' : 'Demo mode'}</strong>
      <small>${esc(configured ? model : 'Connect your API')}</small>
    </span>
    <span class="api-pill-icon">${icon(configured ? 'wifi' : 'key')}</span>
  </button>`;
}

function header(active) {
  return `<header class="site-header">
    <div class="header-inner">
      <button class="brand" data-nav="home" aria-label="Fluentia home">${brandMarkup()}</button>
      <nav class="main-nav" aria-label="Primary">
        <button class="nav-link ${active === 'home' ? 'is-active' : ''}" data-nav="home">Practice</button>
        <button class="nav-link ${active === 'history' ? 'is-active' : ''}" data-nav="history">Journal</button>
        <button class="nav-link ${active === 'vocab' ? 'is-active' : ''}" data-nav="vocab">Word bank</button>
      </nav>
      <div class="header-tools">
        ${apiPillMarkup()}
        <button class="icon-btn desktop-only" data-open-settings aria-label="Settings">${icon('settings')}</button>
      </div>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand"><div class="brand footer-logo">${brandMarkup()}</div><p>English first. Chinese when you truly need it.</p></div>
      <div class="footer-note">
        <span>${icon('shield')} Your API key stays in this browser.</span>
        <span>${icon('headphones')} Speech uses your browser.</span>
      </div>
      <div class="footer-meta">Built for speaking, not scrolling. <span>© ${new Date().getFullYear()} Fluentia</span></div>
    </div>
  </footer>`;
}

function shell(active, main) {
  return `<div class="site">${header(active)}${main}${footer()}</div>`;
}

function sceneDifficulty(scene) {
  const difficulty = getDifficulty(scene.level);
  return difficulty.label;
}

function sceneRow(scene, index) {
  const world = getWorld(scene.world);
  return `<button class="scene-item" data-open-setup="${esc(scene.id)}">
    <span class="scene-item-index">${String(index + 1).padStart(2, '0')}</span>
    <span class="scene-item-copy">
      <strong>${esc(scene.title)}</strong>
      <small>${esc(scene.cn)} · ${esc(sceneDifficulty(scene))} · ${esc(world.name)}</small>
    </span>
    <span class="scene-item-go">${icon('arrow-up')}</span>
  </button>`;
}

function worldCard(world) {
  if (world.id === 'custom') {
    const scenes = customScenes();
    return `<article class="world-card world-custom" data-tone="ink">
      <div class="world-visual">
        ${worldArt('custom')}
        <span class="world-index">${world.index}</span>
        <span class="world-badge">${scenes.length ? `${scenes.length} saved` : 'Make it yours'}</span>
      </div>
      <div class="world-content">
        <div class="world-title-row">
          <div><p class="eyebrow">${world.name}</p><h3>${esc(world.tagline)}</h3></div>
          <span class="world-cn">${world.cn}</span>
        </div>
        <p class="world-desc">${esc(world.description)}</p>
        <div class="scene-list">
          ${
            scenes.length
              ? scenes
                  .slice(0, 4)
                  .map(
                    (scene, index) => `<div class="custom-scene-line">
                      <button class="scene-item" data-open-setup="${esc(scene.id)}">
                        <span class="scene-item-index">${String(index + 1).padStart(2, '0')}</span>
                        <span class="scene-item-copy"><strong>${esc(scene.title)}</strong><small>${esc(
                          scene.cn
                        )} · Custom</small></span>
                        <span class="scene-item-go">${icon('arrow-up')}</span>
                      </button>
                      <button class="scene-delete" data-delete-custom-scene="${esc(
                        scene.id
                      )}" aria-label="Remove saved scene" title="Remove saved scene">${icon('trash')}</button>
                    </div>`
                  )
                  .join('')
              : `<div class="custom-empty">
                  <p>No saved scenes yet.</p>
                  <span>Invent an interview, a negotiation, a first date — anything.</span>
                </div>`
          }
        </div>
        <button class="custom-cta" data-open-custom>
          <span>${icon('plus')} Create a new scene</span>
          <span>${icon('arrow-right')}</span>
        </button>
      </div>
    </article>`;
  }

  const scenes = SCENES.filter((scene) => scene.world === world.id);
  return `<article class="world-card" data-tone="${world.tone}">
    <div class="world-visual">
      ${worldArt(world.id)}
      <span class="world-index">${world.index}</span>
      <span class="world-badge">${scenes.length} scenes</span>
    </div>
    <div class="world-content">
      <div class="world-title-row">
        <div><p class="eyebrow">${world.name}</p><h3>${esc(world.tagline)}</h3></div>
        <span class="world-cn">${world.cn}</span>
      </div>
      <p class="world-desc">${esc(world.description)}</p>
      <div class="scene-list">
        ${scenes.map((scene, index) => sceneRow(scene, index)).join('')}
      </div>
    </div>
  </article>`;
}

function previewCard() {
  const bars = Array.from({ length: 18 }, (_, index) => {
    const height = 22 + ((index * 37) % 64);
    return `<span style="--h:${height}%;--d:${(index * 0.07).toFixed(2)}s"></span>`;
  }).join('');
  return `<div class="preview-wrap">
    <div class="preview-card">
      <div class="preview-bar">
        <span class="live-pill"><i></i> Live room</span>
        <span class="preview-time">08:42</span>
      </div>
      <div class="preview-person">
        <div class="mini-orb"><span>M</span></div>
        <div class="preview-id"><strong>Mia</strong><small>Barista · Brooklyn</small></div>
        <div class="sound-wave" aria-hidden="true">${bars}</div>
      </div>
      <div class="preview-bubble">
        <p>“Morning! What can I get started for you today?”</p>
        <div class="preview-zh">早上好！今天想喝点什么？</div>
      </div>
      <div class="preview-controls">
        <span class="preview-cc">${icon('cc')} <em>EN + 中文</em></span>
        <span class="preview-mic">${icon('mic')}</span>
        <span class="preview-lost">${icon('lifebuoy')} I'm lost</span>
      </div>
      <div class="preview-foot"><span>English only</span><span>·</span><span>1-on-1</span><span class="preview-spark">${icon('sparkles')}</span></div>
    </div>
    <div class="float-card float-one">
      <span class="float-icon">${icon('headphones')}</span>
      <div><strong>No subtitles?</strong><small>Pure listening mode</small></div>
    </div>
    <div class="float-card float-two">
      <span class="float-icon coral">${icon('lifebuoy')}</span>
      <div><strong>Truly stuck?</strong><small>One Chinese lifeline</small></div>
    </div>
  </div>`;
}

function draftBanner() {
  const draft = store.getDraft();
  if (!draft || !draft.messages || draft.messages.length < 2) return '';
  const world = getWorld(draft.scene?.world);
  return `<div class="draft-banner">
    <span class="draft-icon">${icon('history')}</span>
    <div class="draft-copy">
      <strong>Pick up where you left off</strong>
      <span>${esc(draft.scene?.title || 'Conversation')} · ${esc(world.name)} · ${draft.messages.length} messages</span>
    </div>
    <div class="draft-actions">
      <button class="btn btn-small btn-primary" data-resume-draft>Resume</button>
      <button class="btn btn-small btn-quiet" data-discard-draft>Discard</button>
    </div>
  </div>`;
}

function heroView() {
  return `<section class="hero">
    <div class="hero-copy">
      <p class="eyebrow hero-eyebrow"><span class="eyebrow-dot"></span> A private room for real English</p>
      <h1>Don't study English.<br /><em>Live</em> in it.</h1>
      <p class="lede">和一位有耐心的外语伙伴，从点一杯咖啡开始。全英文对话，字幕随时切换，真的卡住时才用中文求助。</p>
      <div class="hero-actions">
        <button class="btn btn-primary btn-lg" data-open-setup="cafe">Start a conversation ${icon('arrow-right')}</button>
        <button class="btn btn-ghost btn-lg" data-scroll-to="how">See how it works ${icon('chevron-down')}</button>
      </div>
      <div class="hero-meta">
        <span><strong>12</strong> ready-made scenes</span>
        <span class="meta-divider"></span>
        <span><strong>3</strong> subtitle modes</span>
        <span class="meta-divider"></span>
        <span><strong>1</strong> Chinese lifeline</span>
      </div>
      <div class="hero-api-note">${icon('key')} Bring your own model <span>·</span> DeepSeek, OpenAI, custom</div>
    </div>
    <div class="hero-stage">${previewCard()}</div>
  </section>`;
}

function connectStrip() {
  if (store.isConfigured(state.settings)) return '';
  return `<div class="connect-strip">
    <div class="connect-strip-copy">
      <span class="connect-strip-icon">${icon('sparkles')}</span>
      <div><strong>You're in demo mode.</strong><span>Connect your own AI model to unlock unscripted, in-character replies.</span></div>
    </div>
    <button class="btn btn-small btn-dark" data-open-settings>Connect your API ${icon('arrow-right')}</button>
  </div>`;
}

function worldsSection() {
  return `<section class="section worlds-section" id="worlds">
    <div class="section-head">
      <div>
        <p class="eyebrow">Choose a world</p>
        <h2>Pick a room.<br /><em>Step inside.</em></h2>
      </div>
      <p class="section-note">Four worlds, twelve ready-made scenes — plus any room you can imagine. Every conversation starts in English.</p>
    </div>
    <div class="world-grid">${WORLDS.map(worldCard).join('')}</div>
  </section>`;
}

function weekBars(progress) {
  const max = Math.max(1, ...progress.week.map((day) => day.minutes));
  return progress.week
    .map(
      (day) => `<div class="week-day">
        <div class="week-track"><span class="${day.minutes > 0 ? 'has-practice' : ''}" style="--bar:${Math.max(
          4,
          Math.round((day.minutes / max) * 100)
        )}%"></span></div>
        <small>${day.label}</small>
      </div>`
    )
    .join('');
}

function rhythmSection(progress) {
  const opener = OPENERS[new Date().getDate() % OPENERS.length];
  const openerIndex = OPENERS.indexOf(opener);
  const latest = progress.latest;
  return `<section class="section rhythm-section">
    <div class="rhythm-grid">
      <article class="prompt-card">
        <div class="prompt-top">
          <p class="eyebrow light">Today's prompt</p>
          <span class="prompt-mark">${icon('sparkles')}</span>
        </div>
        <h2>${esc(opener.en)}</h2>
        <p class="prompt-zh">${esc(opener.zh)}</p>
        <div class="prompt-bottom">
          <button class="btn btn-light" data-open-prompt="${openerIndex}">Take this prompt ${icon('arrow-right')}</button>
          <span>No preparation needed.</span>
        </div>
      </article>
      <article class="progress-card">
        <div class="progress-head">
          <div>
            <p class="eyebrow">Your rhythm</p>
            <div class="streak-line"><span class="streak-number">${progress.streak}</span><span class="streak-label">day streak ${icon('flame')}</span></div>
          </div>
          <div class="score-chip ${progress.averageScore ? `is-${scoreTone(progress.averageScore)}` : ''}">
            <strong>${progress.averageScore ?? '—'}</strong><small>avg. score</small>
          </div>
        </div>
        <div class="week-chart">${weekBars(progress)}</div>
        <div class="progress-stats">
          <span><strong>${progress.totalMinutes}</strong> minutes</span>
          <span><strong>${progress.sessions}</strong> sessions</span>
          <span><strong>${progress.totalWords}</strong> words</span>
        </div>
        ${
          latest
            ? `<button class="latest-session" data-open-report="${esc(latest.id)}">
                <span class="latest-dot"></span>
                <span class="latest-copy"><strong>${esc(latest.scene?.title || 'Conversation')}</strong><small>${timeAgo(
                  latest.startedAt
                )} · ${formatMinutes(latest.stats?.durationSeconds || 0)}</small></span>
                <span class="latest-go">${icon('arrow-right')}</span>
              </button>`
            : `<div class="latest-empty">Your first conversation will set the rhythm.</div>`
        }
      </article>
    </div>
  </section>`;
}

function principlesSection() {
  return `<section class="section principles-section" id="how">
    <div class="principles-head">
      <p class="eyebrow">The rules of the room</p>
      <h2>Designed to keep you<br /><em>in English.</em></h2>
    </div>
    <div class="principles-grid">
      <div class="principle">
        <span class="principle-number">01</span>
        <div class="principle-icon">${icon('globe')}</div>
        <h3>English first</h3>
        <p>Your partner stays in English — no auto-translation, no textbook scripts, no escape into Chinese just because it is easier.</p>
        <small>全英文优先，逼出英文思维。</small>
      </div>
      <div class="principle">
        <span class="principle-number">02</span>
        <div class="principle-icon">${icon('cc')}</div>
        <h3>Subtitles on your terms</h3>
        <p>Go audio-only for pure listening, keep English captions for support, or add a quiet Chinese translation under each line.</p>
        <small>字幕随时切换，难度自己掌握。</small>
      </div>
      <div class="principle">
        <span class="principle-number">03</span>
        <div class="principle-icon">${icon('lifebuoy')}</div>
        <h3>A lifeline, not a habit</h3>
        <p>When you are truly lost, one button gets you a short Chinese explanation and a simple English sentence to get back in.</p>
        <small>真的听不懂，才用中文求助。</small>
      </div>
    </div>
  </section>`;
}

function homeView() {
  const progress = store.getProgress();
  return shell(
    'home',
    `<main class="home">
      ${draftBanner()}
      ${heroView()}
      ${connectStrip()}
      ${worldsSection()}
      ${rhythmSection(progress)}
      ${principlesSection()}
    </main>`
  );
}

function statCard(label, value, note, iconName) {
  return `<div class="stat-card">
    <span class="stat-icon">${icon(iconName)}</span>
    <strong>${value}</strong>
    <span class="stat-label">${label}</span>
    <small>${note}</small>
  </div>`;
}

function historyView() {
  const sessions = store.getSessions().filter((session) => session.endedAt);
  const progress = store.getProgress();
  return shell(
    'history',
    `<main class="page">
      <section class="page-head">
        <div>
          <p class="eyebrow">Your journal</p>
          <h1>Evidence that<br /><em>you spoke.</em></h1>
          <p class="page-lede">Every finished conversation, every correction, every phrase worth keeping. Stored locally in this browser.</p>
        </div>
        <button class="btn btn-primary" data-open-setup="cafe">New conversation ${icon('plus')}</button>
      </section>
      <section class="stats-row">
        ${statCard('Conversations', progress.sessions, 'finished sessions', 'message')}
        ${statCard('Speaking time', progress.totalSeconds > 0 && progress.totalSeconds < 60 ? '<1m' : `${progress.totalMinutes}m`, 'total speaking time', 'clock')}
        ${statCard('Words spoken', progress.totalWords, 'in English', 'chart')}
        ${statCard('Current streak', `${progress.streak}d`, 'keep it alive', 'flame')}
      </section>
      <section class="journal-grid">
        <div class="journal-main">
          <div class="journal-toolbar">
            <h2>Conversation history</h2>
            <div class="filter-chips" data-history-filter>
              <button class="chip is-active" data-filter="all">All</button>
              <button class="chip" data-filter="daily">Daily</button>
              <button class="chip" data-filter="campus">Campus</button>
              <button class="chip" data-filter="play">Play</button>
              <button class="chip" data-filter="custom">Custom</button>
            </div>
          </div>
          ${
            sessions.length
              ? `<div class="session-list" id="session-list">${sessions
                  .map((session) => {
                    const world = getWorld(session.scene?.world);
                    const score = session.report?.overall;
                    return `<button class="session-card" data-open-report="${esc(session.id)}" data-world="${esc(
                      session.scene?.world || 'custom'
                    )}">
                      <span class="session-world">${esc(world.name)}</span>
                      <span class="session-main">
                        <strong>${esc(session.scene?.title || 'Conversation')}</strong>
                        <small>${esc(session.scene?.aiName || 'Partner')} · ${formatDate(
                          session.startedAt
                        )} · ${formatMinutes(session.stats?.durationSeconds || 0)} · ${session.stats?.turns || 0} ${
                          (session.stats?.turns || 0) === 1 ? 'turn' : 'turns'
                        }</small>
                      </span>
                      <span class="session-score is-${score ? scoreTone(score) : 'pending'}">
                        ${score ? `<strong>${score}</strong><small>${scoreLabel(score)}</small>` : `<strong>…</strong><small>Analysing</small>`}
                      </span>
                      <span class="session-arrow">${icon('arrow-right')}</span>
                    </button>`;
                  })
                  .join('')}</div>`
              : `<div class="empty-state">
                  <span class="empty-icon">${icon('message')}</span>
                  <h3>No conversations yet.</h3>
                  <p>Finish a session and your transcript, score and corrections will appear here.</p>
                  <button class="btn btn-primary" data-open-setup="cafe">Start your first conversation</button>
                </div>`
          }
        </div>
        <aside class="journal-aside">
          <div class="aside-card">
            <p class="eyebrow">This week</p>
            <div class="aside-week">${weekBars(progress)}</div>
            <p class="aside-note">${progress.sessions ? 'A little speaking beats a lot of scrolling.' : 'Your week is a blank page. One conversation is enough to start.'}</p>
          </div>
          <div class="aside-card aside-tip">
            <span class="aside-tip-icon">${icon('sparkles')}</span>
            <h3>Make the next one harder.</h3>
            <p>Once a scene feels easy, turn off subtitles or raise the level. Discomfort is where the progress is.</p>
            <button class="text-link" data-nav="home">Find a scene ${icon('arrow-right')}</button>
          </div>
        </aside>
      </section>
    </main>`
  );
}

function vocabView() {
  const items = store.getVocab();
  return shell(
    'vocab',
    `<main class="page">
      <section class="page-head">
        <div>
          <p class="eyebrow">Your word bank</p>
          <h1>Phrases that<br /><em>earned their place.</em></h1>
          <p class="page-lede">Pulled from your conversations and saved automatically. Read them, hear them, then use them in the next room.</p>
        </div>
        <button class="btn btn-primary" data-open-setup="cafe">Use them in a scene ${icon('arrow-right')}</button>
      </section>
      <section class="vocab-toolbar">
        <label class="search-field">${icon('search')}<input type="search" placeholder="Search your phrases..." data-vocab-search /></label>
        <label class="switch-line"><input type="checkbox" data-vocab-hide /><span class="switch"></span><span>Hide Chinese (practice mode)</span></label>
        <span class="vocab-count">${items.length} saved</span>
      </section>
      ${
        items.length
          ? `<section class="vocab-grid" id="vocab-grid">
              ${items
                .map(
                  (item) => `<article class="vocab-card" data-vocab-id="${esc(item.id)}" data-search="${esc(
                    `${item.en} ${item.zh}`.toLowerCase()
                  )}">
                    <div class="vocab-en">${esc(item.en)}</div>
                    <div class="vocab-zh">${esc(item.zh || 'No translation saved.')}</div>
                    <div class="vocab-meta"><span>${esc(item.source || 'Conversation')}</span><span>${timeAgo(item.addedAt)}</span></div>
                    <div class="vocab-actions">
                      <button class="icon-btn small" data-vocab-speak="${esc(item.en)}" aria-label="Hear this phrase">${icon('volume')}</button>
                      <button class="text-link danger" data-vocab-delete="${esc(item.id)}">${icon('trash')} Remove</button>
                    </div>
                  </article>`
                )
                .join('')}
            </section>`
          : `<div class="empty-state large">
              <span class="empty-icon">${icon('book')}</span>
              <h3>Your word bank is waiting.</h3>
              <p>Finish a conversation and Fluentia will collect the phrases you reached for — and the ones you should reach for next time.</p>
              <button class="btn btn-primary" data-open-setup="cafe">Have a conversation</button>
            </div>`
      }
    </main>`
  );
}

function setupContent(scene, picked) {
  const world = getWorld(scene.world);
  return `<div class="setup-head">
    <div class="setup-head-copy">
      <p class="eyebrow">${esc(world.name)} · ${esc(scene.cn || '')}</p>
      <h2>${esc(scene.title)}</h2>
      <p>${esc(scene.blurb)}</p>
    </div>
    <button class="icon-btn close-btn" data-close-modal aria-label="Close">${icon('close')}</button>
  </div>
  <div class="setup-body">
    <div class="setup-partner">
      <div class="partner-orb"><span>${esc((scene.aiName || 'A').slice(0, 1))}</span></div>
      <div class="partner-copy">
        <span>You'll be talking to</span>
        <strong>${esc(scene.aiName)}</strong>
        <small>${esc(scene.aiRole)} · ${esc(scene.setting)}</small>
      </div>
      <span class="partner-live">${icon('wifi')} live</span>
    </div>
    <div class="setup-goals">
      <span class="setup-label">Your mission</span>
      <ul>${(scene.goals || []).map((goal) => `<li><span class="goal-dot"></span> ${esc(goal)}</li>`).join('')}</ul>
    </div>
    <div class="setup-section">
      <div class="setup-label-row"><span class="setup-label">Subtitles</span><small>Switch any time inside the room</small></div>
      <div class="choice-grid subtitle-choices">
        ${SUBTITLE_MODES.map(
          (mode) => `<button class="choice-card ${picked.subtitle === mode.id ? 'is-active' : ''}" data-choice="subtitle" data-value="${mode.id}">
            <span class="choice-icon">${icon(mode.icon)}</span>
            <strong>${mode.label}</strong>
            <em>${mode.cn}</em>
            <small>${mode.desc}</small>
          </button>`
        ).join('')}
      </div>
    </div>
    <div class="setup-two-col">
      <div class="setup-section">
        <span class="setup-label">Level</span>
        <div class="level-list">
          ${DIFFICULTIES.map(
            (level) => `<button class="level-choice ${picked.difficulty === level.id ? 'is-active' : ''}" data-choice="difficulty" data-value="${level.id}">
              <span><strong>${level.label}</strong><em>${level.cn}</em></span>
              <small>${level.desc}</small>
            </button>`
          ).join('')}
        </div>
      </div>
      <div class="setup-side-stack">
        <div class="setup-section">
          <span class="setup-label">Accent</span>
          <div class="segmented">
            ${ACCENTS.map(
              (accent) => `<button class="${picked.accent === accent.id ? 'is-active' : ''}" data-choice="accent" data-value="${accent.id}">${accent.label}<small>${accent.cn}</small></button>`
            ).join('')}
          </div>
        </div>
        <div class="setup-section">
          <span class="setup-label">Pace</span>
          <div class="segmented compact">
            ${PACES.map(
              (pace) => `<button class="${picked.pace === pace.id ? 'is-active' : ''}" data-choice="pace" data-value="${pace.id}">${pace.label}</button>`
            ).join('')}
          </div>
        </div>
        <div class="setup-section">
          <span class="setup-label">Coaching</span>
          <div class="segmented compact">
            <button class="${picked.coach === 'gentle' ? 'is-active' : ''}" data-choice="coach" data-value="gentle">Gentle</button>
            <button class="${picked.coach === 'detailed' ? 'is-active' : ''}" data-choice="coach" data-value="detailed">Detailed</button>
          </div>
        </div>
      </div>
    </div>
    <div class="setup-section">
      <div class="setup-label-row"><span class="setup-label">Session length</span><small>You can end whenever you like</small></div>
      <div class="duration-choices">
        ${DURATIONS.map(
          (duration) => `<button class="${picked.duration === duration.value ? 'is-active' : ''}" data-choice="duration" data-value="${duration.value}">
            <strong>${duration.label}</strong><small>${duration.cn}</small>
          </button>`
        ).join('')}
      </div>
    </div>
    <p class="setup-privacy">${icon('shield')} Speech is handled by your browser. Conversation text is sent only to the model provider you configure.</p>
  </div>
  <div class="setup-footer">
    <div class="setup-summary" id="setup-summary"></div>
    <button class="btn btn-primary btn-lg" data-start-session>Enter the room ${icon('arrow-right')}</button>
  </div>`;
}

function setupSummary(scene, picked) {
  const level = getDifficulty(picked.difficulty);
  const accent = getAccent(picked.accent);
  const subtitle = getSubtitle(picked.subtitle);
  const pace = getPace(picked.pace);
  return `${esc(scene.aiName)} will speak <strong>${accent.label} English</strong> at a <strong>${pace.label.toLowerCase()}</strong> pace · ${esc(
    subtitle.label
  )} · ${level.label}`;
}

function openSetup(scene) {
  if (!scene) {
    toast('That scene could not be found.', { type: 'error' });
    return;
  }
  const picked = {
    ...DEFAULT_CONFIG,
    ...state.settings.lastConfig,
    difficulty: scene.level || state.settings.lastConfig?.difficulty || DEFAULT_CONFIG.difficulty
  };
  openModal({
    className: 'modal-setup',
    label: `Set up ${scene.title}`,
    content: setupContent(scene, picked),
    onMount(panel, close) {
      const summary = panel.querySelector('#setup-summary');
      const update = () => {
        summary.innerHTML = setupSummary(scene, picked);
        panel.querySelectorAll('[data-choice]').forEach((button) => {
          const field = button.dataset.choice;
          button.classList.toggle('is-active', String(picked[field]) === String(button.dataset.value));
        });
      };
      update();

      panel.addEventListener('click', (event) => {
        const choice = event.target.closest('[data-choice]');
        if (choice) {
          const field = choice.dataset.choice;
          let value = choice.dataset.value;
          if (field === 'duration') value = Number(value);
          picked[field] = value;
          update();
        }
      });

      const start = () => {
        close();
        setTimeout(() => startSession(scene, { ...picked }), 120);
      };
      panel.querySelector('[data-start-session]').addEventListener('click', start);
    }
  });
}

function openSettings(initialTab = 'ai') {
  const settings = store.getSettings();
  let selectedProvider = settings.provider || 'deepseek';
  const voices = getEnglishVoices();
  const voiceOptions = [`<option value="auto">Auto · best voice for accent</option>`]
    .concat(
      voices.map(
        (voice) =>
          `<option value="${esc(voice.voiceURI)}" ${settings.voiceURI === voice.voiceURI ? 'selected' : ''}>${esc(
            voice.name
          )} · ${esc(voice.lang)}</option>`
      )
    )
    .join('');

  const content = `<div class="settings-head">
    <div>
      <p class="eyebrow">Settings</p>
      <h2>Your room,<br /><em>your model.</em></h2>
      <p class="settings-lede">Connect any OpenAI-compatible API. Your key is stored in this browser and forwarded only through the local gateway.</p>
    </div>
    <button class="icon-btn close-btn" data-close-modal aria-label="Close">${icon('close')}</button>
  </div>
  <div class="settings-tabs" role="tablist">
    <button class="settings-tab ${initialTab === 'ai' ? 'is-active' : ''}" data-settings-tab="ai" role="tab">${icon('key')} AI model</button>
    <button class="settings-tab ${initialTab === 'voice' ? 'is-active' : ''}" data-settings-tab="voice" role="tab">${icon('headphones')} Voice</button>
    <button class="settings-tab ${initialTab === 'data' ? 'is-active' : ''}" data-settings-tab="data" role="tab">${icon('shield')} Data</button>
  </div>
  <div class="settings-body">
    <section class="settings-panel ${initialTab === 'ai' ? 'is-active' : ''}" data-panel="ai">
      <div class="field-label">Provider</div>
      <div class="provider-grid">
        ${PROVIDERS.map(
          (provider) => `<button class="provider-card ${selectedProvider === provider.id ? 'is-active' : ''}" data-provider="${provider.id}">
            <strong>${provider.name}</strong><small>${provider.cn}</small>
          </button>`
        ).join('')}
      </div>
      <p class="provider-note" id="provider-note"></p>
      <div class="field-grid">
        <label class="field">
          <span>Base URL <small>OpenAI-compatible endpoint</small></span>
          <input id="set-base" type="url" value="${esc(settings.baseUrl)}" placeholder="https://api.deepseek.com/v1" autocomplete="off" spellcheck="false" />
        </label>
        <label class="field">
          <span>Model <small>Exact model name</small></span>
          <input id="set-model" type="text" value="${esc(settings.model)}" placeholder="deepseek-chat" autocomplete="off" spellcheck="false" />
        </label>
      </div>
      <label class="field">
        <span>API key <small>Stored locally · never sent anywhere except your provider</small></span>
        <div class="key-field">
          <input id="set-key" type="password" value="${esc(settings.apiKey)}" placeholder="sk-..." autocomplete="off" spellcheck="false" />
          <button class="icon-btn" data-toggle-key aria-label="Show API key">${icon('eye')}</button>
        </div>
      </label>
      <div class="field-grid">
        <label class="field">
          <span>Your name <small>Optional — your partner may use it</small></span>
          <input id="set-name" type="text" value="${esc(settings.displayName || '')}" placeholder="How should we call you?" maxlength="40" />
        </label>
        <label class="field">
          <span>Temperature <small>Higher = more surprising</small></span>
          <div class="range-field">
            <input id="set-temp" type="range" min="0.2" max="1.2" step="0.1" value="${Number(settings.temperature) || 0.8}" />
            <output id="temp-value">${(Number(settings.temperature) || 0.8).toFixed(1)}</output>
          </div>
        </label>
      </div>
      <div class="test-row">
        <button class="btn btn-outline btn-small" data-test-connection>${icon('wifi')} Test connection</button>
        <div class="test-status" id="test-status"></div>
      </div>
      <div class="settings-note">${icon('shield')} This app never stores your key on the server. It is kept in <code>localStorage</code> and sent to the local proxy only for each request. For a shared computer, clear your key when you finish.</div>
    </section>
    <section class="settings-panel ${initialTab === 'voice' ? 'is-active' : ''}" data-panel="voice">
      <div class="voice-preview">
        <div class="partner-orb small"><span>M</span></div>
        <div><strong>Browser voice</strong><span>Your partner speaks with the best available voice for the accent you choose in each scene.</span></div>
      </div>
      <label class="field">
        <span>Preferred voice <small>Leave on Auto unless you have a favourite</small></span>
        <select id="set-voice">${voiceOptions}</select>
      </label>
      <label class="switch-line large"><input id="set-autospeak" type="checkbox" ${settings.autoSpeak !== false ? 'checked' : ''} /><span class="switch"></span><span>Speak each reply automatically</span></label>
      <div class="voice-sample-card">
        <div class="voice-sample-bars" aria-hidden="true">${Array.from({ length: 17 }, (_, index) => `<span style="--h:${22 + ((index * 31) % 66)}%;--d:${(index * 0.06).toFixed(2)}s"></span>`).join('')}</div>
        <div class="voice-sample-copy"><strong>“Hi there. I'm your English partner.”</strong><small>Sample line · uses the voice selected above</small></div>
        <button class="icon-btn small" data-test-voice aria-label="Play voice sample">${icon('play')}</button>
      </div>
      <div class="voice-support">
        <div class="voice-support-card">
          <span>Microphone</span>
          <strong class="${stt.supported ? 'is-ok' : 'is-warn'}">${stt.supported ? 'Ready in this browser' : 'Type-only mode'}</strong>
          <p>${stt.supported ? 'Chrome and Edge give the best live recognition. Allow microphone access when prompted.' : 'Live speech recognition is not available here. You can still type every reply.'}</p>
        </div>
        <div class="voice-support-card">
          <span>Voice engine</span>
          <strong>Browser native</strong>
          <p>Voices come from your operating system. No audio is uploaded by Fluentia.</p>
        </div>
      </div>
      <div class="settings-note">${icon('headphones')} If the voice list is empty, Chrome or Edge will choose a default. Chinese lifeline explanations use a Chinese voice when one is available.</div>
    </section>
    <section class="settings-panel ${initialTab === 'data' ? 'is-active' : ''}" data-panel="data">
      <div class="data-stats" id="data-stats"></div>
      <div class="data-actions">
        <button class="btn btn-outline btn-small" data-export-data>${icon('download')} Export my data</button>
        <button class="btn btn-danger-ghost btn-small" data-clear-data>${icon('trash')} Clear all data</button>
      </div>
      <div class="settings-note">${icon('lock')} All conversations, reports and phrases live in this browser's local storage. Export a copy before clearing your browser data. Your API key is omitted from exports.</div>
    </section>
  </div>
  <div class="settings-footer">
    <button class="btn btn-quiet" data-close-modal>Cancel</button>
    <button class="btn btn-primary" data-save-settings>Save settings ${icon('check')}</button>
  </div>`;

  openModal({
    className: 'modal-settings',
    label: 'Settings',
    content,
    onMount(panel, close) {
      const note = panel.querySelector('#provider-note');
      const baseInput = panel.querySelector('#set-base');
      const modelInput = panel.querySelector('#set-model');
      const keyInput = panel.querySelector('#set-key');
      const tempInput = panel.querySelector('#set-temp');
      const tempValue = panel.querySelector('#temp-value');

      const updateNote = () => {
        const provider = PROVIDERS.find((item) => item.id === selectedProvider);
        note.textContent = provider?.note || '';
      };
      updateNote();

      panel.querySelectorAll('[data-provider]').forEach((button) => {
        button.addEventListener('click', () => {
          selectedProvider = button.dataset.provider;
          panel.querySelectorAll('[data-provider]').forEach((item) => item.classList.toggle('is-active', item === button));
          const provider = PROVIDERS.find((item) => item.id === selectedProvider);
          if (provider) {
            if (provider.id !== 'custom') {
              baseInput.value = provider.baseUrl;
              modelInput.value = provider.model;
            } else {
              baseInput.value = baseInput.value || '';
              modelInput.value = modelInput.value || '';
            }
          }
          updateNote();
        });
      });

      panel.querySelectorAll('[data-settings-tab]').forEach((tab) => {
        tab.addEventListener('click', () => {
          const name = tab.dataset.settingsTab;
          panel.querySelectorAll('[data-settings-tab]').forEach((item) => item.classList.toggle('is-active', item === tab));
          panel.querySelectorAll('[data-panel]').forEach((section) => {
            section.classList.toggle('is-active', section.dataset.panel === name);
          });
        });
      });

      tempInput.addEventListener('input', () => {
        tempValue.textContent = Number(tempInput.value).toFixed(1);
      });

      panel.querySelector('[data-toggle-key]').addEventListener('click', (event) => {
        const button = event.currentTarget;
        const showing = keyInput.type === 'text';
        keyInput.type = showing ? 'password' : 'text';
        button.innerHTML = icon(showing ? 'eye' : 'eye-off');
        button.setAttribute('aria-label', showing ? 'Show API key' : 'Hide API key');
      });

      const tempSettings = () => ({
        ...store.getSettings(),
        provider: selectedProvider,
        baseUrl: baseInput.value.trim(),
        model: modelInput.value.trim(),
        apiKey: keyInput.value.trim(),
        temperature: Number(tempInput.value) || 0.8,
        displayName: panel.querySelector('#set-name').value.trim(),
        voiceURI: panel.querySelector('#set-voice').value,
        autoSpeak: panel.querySelector('#set-autospeak').checked
      });

      const status = panel.querySelector('#test-status');
      panel.querySelector('[data-test-connection]').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        const candidate = tempSettings();
        if (!candidate.baseUrl || !candidate.model) {
          status.className = 'test-status is-error';
          status.textContent = 'Enter a base URL and model name first.';
          return;
        }
        button.disabled = true;
        button.innerHTML = `${spinner('Testing')} Testing...`;
        status.className = 'test-status is-pending';
        status.textContent = 'Calling your provider through the local gateway...';
        try {
          const reply = await testConnection(candidate);
          status.className = 'test-status is-success';
          status.textContent = `Connected. Model replied: ${reply || 'OK'}`;
        } catch (error) {
          status.className = 'test-status is-error';
          status.textContent = error.message;
        } finally {
          button.disabled = false;
          button.innerHTML = `${icon('wifi')} Test connection`;
        }
      });

      panel.querySelector('[data-test-voice]').addEventListener('click', async () => {
        tts.speak('Hi there. I am your English conversation partner. Ready when you are.', {
          lang: getAccent(state.settings.accent).lang,
          rate: 1,
          voiceURI: panel.querySelector('#set-voice').value
        });
      });

      panel.querySelector('[data-save-settings]').addEventListener('click', () => {
        const candidate = tempSettings();
        if (!candidate.baseUrl || !candidate.model) {
          toast('Add a base URL and model name before saving.', { type: 'error' });
          return;
        }
        try {
          new URL(candidate.baseUrl);
        } catch {
          toast('The base URL is not valid.', { type: 'error' });
          return;
        }
        state.settings = store.saveSettings(candidate);
        close();
        toast(store.isConfigured(state.settings) ? 'Model connected. Your partner is ready.' : 'Settings saved.', {
          type: 'success'
        });
        if (!location.hash.startsWith('#/room')) {
          const scroll = window.scrollY;
          renderRoute({ preserveScroll: true });
          window.scrollTo(0, scroll);
        } else {
          refreshHeaderPill();
          if (store.isConfigured(state.settings)) document.querySelector('.demo-pill')?.remove();
        }
      });

      const stats = panel.querySelector('#data-stats');
      const progress = store.getProgress();
      stats.innerHTML = `<div><strong>${progress.sessions}</strong><span>sessions</span></div><div><strong>${progress.totalWords}</strong><span>words</span></div><div><strong>${store.getVocab().length}</strong><span>phrases</span></div>`;

      panel.querySelector('[data-export-data]').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fluentia-export-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast('Your data export is downloading.', { type: 'success' });
      });

      panel.querySelector('[data-clear-data]').addEventListener('click', async () => {
        const confirmed = await confirmDialog({
          title: 'Clear everything?',
          message: 'This removes all conversations, reports, saved phrases, custom scenes and your API key from this browser. It cannot be undone.',
          confirmLabel: 'Clear all data',
          danger: true
        });
        if (confirmed) {
          store.clearAll();
          close();
          location.hash = '#/';
          location.reload();
        }
      });
    }
  });
}

function openCustomScene(prefill = null) {
  const content = `<div class="custom-head">
    <div>
      <p class="eyebrow">Your own scene</p>
      <h2>Build a room<br /><em>from scratch.</em></h2>
      <p>Set the topic, the person and the stakes. Your partner will stay in character and keep the conversation in English.</p>
    </div>
    <button class="icon-btn close-btn" data-close-modal aria-label="Close">${icon('close')}</button>
  </div>
  <form class="custom-form" id="custom-form" novalidate>
    <div class="preset-row">
      <span class="field-label">Start from a preset</span>
      <div class="preset-chips">
        ${CUSTOM_PRESETS.map(
          (preset, index) => `<button type="button" class="chip" data-custom-preset="${index}">${preset.cn}</button>`
        ).join('')}
      </div>
    </div>
    <label class="field">
      <span>Topic <small>What is this conversation about?</small></span>
      <input name="topic" type="text" placeholder="e.g. A job interview for a product role" maxlength="120" data-autofocus required />
    </label>
    <label class="field">
      <span>Setting <small>Where are you, and what is happening?</small></span>
      <input name="setting" type="text" placeholder="e.g. A glass meeting room at a startup" maxlength="180" />
    </label>
    <div class="field-grid">
      <label class="field">
        <span>AI name</span>
        <input name="aiName" type="text" placeholder="e.g. Claire" maxlength="40" />
      </label>
      <label class="field">
        <span>AI role</span>
        <input name="aiRole" type="text" placeholder="e.g. the hiring manager" maxlength="80" />
      </label>
    </div>
    <div class="field-grid">
      <label class="field">
        <span>Personality</span>
        <input name="personality" type="text" placeholder="e.g. warm but direct, hates vague answers" maxlength="160" />
      </label>
      <label class="field">
        <span>Your role</span>
        <input name="userRole" type="text" placeholder="e.g. a candidate" maxlength="80" />
      </label>
    </div>
    <label class="field">
      <span>What do you want to practise? <small>Optional, but it sharpens the scene</small></span>
      <input name="goal" type="text" placeholder="e.g. Give specific examples and ask one good question" maxlength="160" />
    </label>
    <label class="field">
      <span>Opening line <small>Optional — leave blank and we'll write one</small></span>
      <input name="opening" type="text" placeholder="e.g. Thanks for coming in. Tell me about yourself." maxlength="220" />
    </label>
    <label class="switch-line"><input name="save" type="checkbox" checked /><span class="switch"></span><span>Save this scene to my collection</span></label>
    <div class="custom-actions">
      <button type="button" class="btn btn-quiet" data-close-modal>Cancel</button>
      <button type="submit" class="btn btn-primary">Continue to setup ${icon('arrow-right')}</button>
    </div>
  </form>`;

  openModal({
    className: 'modal-custom',
    label: 'Create a custom scene',
    content,
    onMount(panel, close) {
      const form = panel.querySelector('#custom-form');
      if (prefill) {
        if (prefill.topic) form.topic.value = prefill.topic;
        if (prefill.setting) form.setting.value = prefill.setting;
        if (prefill.aiName) form.aiName.value = prefill.aiName;
        if (prefill.aiRole) form.aiRole.value = prefill.aiRole;
        if (prefill.personality) form.personality.value = prefill.personality;
        if (prefill.userRole) form.userRole.value = prefill.userRole;
        if (prefill.goal) form.goal.value = prefill.goal;
        if (prefill.opening) form.opening.value = prefill.opening;
      }
      panel.querySelectorAll('[data-custom-preset]').forEach((button) => {
        button.addEventListener('click', () => {
          const preset = CUSTOM_PRESETS[Number(button.dataset.customPreset)];
          if (!preset) return;
          form.topic.value = preset.topic;
          form.setting.value = preset.setting;
          form.aiName.value = preset.aiName;
          form.aiRole.value = preset.aiRole;
          form.personality.value = preset.personality;
          form.userRole.value = preset.userRole;
          form.goal.value = preset.goal;
          form.opening.value = preset.opening;
          panel.querySelectorAll('[data-custom-preset]').forEach((item) => item.classList.toggle('is-active', item === button));
        });
      });

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        if (!String(data.topic || '').trim()) {
          toast('Give your scene a topic first.', { type: 'error' });
          form.topic.focus();
          return;
        }
        const scene = buildCustomScene(data);
        const shouldSave = scene.isCustom && Boolean(data.save);
        if (shouldSave) store.saveCustomScene(scene);
        close();
        if (shouldSave && parseRoute().name === 'home') {
          renderRoute({ preserveScroll: true });
          toast('Scene saved to your collection.', { type: 'success', duration: 3000 });
        }
        setTimeout(() => openSetup(scene), 160);
      });
    }
  });
}

function openPrompt(index) {
  const opener = OPENERS[index] || OPENERS[0];
  const scene = buildCustomScene({
    topic: opener.topic,
    setting: 'A quiet corner with two comfortable chairs and nowhere else to be.',
    aiName: 'Alex',
    aiRole: 'a thoughtful conversation partner',
    personality: 'curious, relaxed and genuinely interested; asks one good question at a time',
    userRole: 'yourself',
    goal: 'Answer with a story and ask one question back',
    opening: opener.en
  });
  scene.openingZh = opener.zh;
  scene.title = 'Today\'s Prompt';
  scene.blurb = opener.en;
  openSetup(scene);
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function sessionStats(messages) {
  const userMessages = messages.filter((message) => message.role === 'user');
  const aiMessages = messages.filter((message) => message.role === 'assistant');
  const words = userMessages.reduce((sum, message) => sum + String(message.text || '').trim().split(/\s+/).filter(Boolean).length, 0);
  const unique = new Set(
    userMessages
      .flatMap((message) => String(message.text || '').toLowerCase().match(/[a-z']+/g) || [])
      .filter((word) => word.length > 2)
  ).size;
  return {
    turns: userMessages.length,
    userWords: words,
    aiWords: aiMessages.reduce((sum, message) => sum + String(message.text || '').trim().split(/\s+/).filter(Boolean).length, 0),
    uniqueWords: unique,
    messages: messages.length
  };
}

function startSession(scene, config) {
  const now = new Date();
  const messages = [
    {
      id: `m_${Date.now()}`,
      role: 'assistant',
      text: scene.opening,
      translation: scene.openingZh || '',
      followup: '',
      ts: now.toISOString(),
      kind: 'opening'
    }
  ];
  const session = {
    id: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    sceneId: scene.id,
    scene: clone(scene),
    config: { ...config },
    startedAt: now.toISOString(),
    endedAt: null,
    messages,
    coachNotes: [],
    suggestions: (scene.phrases || []).slice(0, 3).map((phrase) => phrase.en),
    stats: { ...sessionStats(messages), durationSeconds: 0 },
    report: null,
    status: 'active'
  };
  state.settings = store.saveSettings({ lastConfig: { ...config } });
  state.session = session;
  store.saveDraft(session);
  navigate('room');
}

function refreshHeaderPill() {
  const pill = document.querySelector('.api-pill');
  if (pill) {
    const temp = document.createElement('div');
    temp.innerHTML = apiPillMarkup();
    pill.replaceWith(temp.firstElementChild);
  }
}

function resumeDraft() {
  const draft = store.getDraft();
  if (!draft) {
    toast('That draft is no longer available.', { type: 'error' });
    return;
  }
  state.session = draft;
  navigate('room');
}

async function discardDraft() {
  const confirmed = await confirmDialog({
    title: 'Discard this draft?',
    message: 'The messages from this unfinished conversation will be removed from this browser.',
    confirmLabel: 'Discard draft',
    danger: true
  });
  if (!confirmed) return;
  store.clearDraft();
  toast('Draft discarded.');
  renderRoute();
}

function bindHistory(panel) {
  const list = panel.querySelector('#session-list');
  if (!list) return;
  panel.querySelectorAll('[data-history-filter] [data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      panel.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('is-active', item === button));
      const filter = button.dataset.filter;
      list.querySelectorAll('.session-card').forEach((card) => {
        card.hidden = filter !== 'all' && card.dataset.world !== filter;
      });
    });
  });
}

function bindVocab(panel) {
  const grid = panel.querySelector('#vocab-grid');
  const search = panel.querySelector('[data-vocab-search]');
  const hide = panel.querySelector('[data-vocab-hide]');
  if (!grid) return;
  const apply = () => {
    const query = (search?.value || '').trim().toLowerCase();
    grid.querySelectorAll('.vocab-card').forEach((card) => {
      card.hidden = query && !card.dataset.search.includes(query);
    });
  };
  search?.addEventListener('input', apply);
  hide?.addEventListener('change', () => {
    grid.classList.toggle('hide-chinese', hide.checked);
  });
  grid.addEventListener('click', (event) => {
    const speak = event.target.closest('[data-vocab-speak]');
    if (speak) {
      tts.speak(speak.dataset.vocabSpeak, { lang: getAccent(state.settings.accent).lang, rate: 0.9, voiceURI: state.settings.voiceURI });
      return;
    }
    const remove = event.target.closest('[data-vocab-delete]');
    if (remove) {
      event.stopPropagation();
      store.removeVocab(remove.dataset.vocabDelete);
      toast('Phrase removed.');
      renderRoute();
      return;
    }
    const card = event.target.closest('.vocab-card');
    if (card && grid.classList.contains('hide-chinese')) card.classList.toggle('is-revealed');
  });
}

function renderRoute({ preserveScroll = false } = {}) {
  const scroll = preserveScroll ? window.scrollY : 0;
  const route = parseRoute();
  if (state.cleanupRoom) {
    state.cleanupRoom();
    state.cleanupRoom = null;
    state.room = null;
    if (route.name !== 'room') state.session = null;
  }
  state.lastRoute = route.name;

  if (route.name === 'room') {
    if (!state.session) state.session = store.getDraft();
    if (!state.session) {
      toast('Start a conversation to enter the room.', { type: 'error' });
      location.hash = '#/';
      return;
    }
    app.innerHTML = '<div id="room-root"></div>';
    state.room = mountRoom(document.getElementById('room-root'), {
      session: state.session,
      getSettings: () => state.settings,
      confirm: confirmDialog,
      toast,
      onSessionChange(session) {
        state.session = session;
        store.saveDraft(session);
      },
      onEnd(session) {
        state.session = null;
        store.clearDraft();
        store.saveSession(session);
        state.cleanupRoom = null;
        navigate(`report/${session.id}`);
      },
      onExit() {
        state.session = null;
        navigate('');
      },
      onSettings() {
        openSettings('voice');
      },
      onNeedApi() {
        openSettings('ai');
      }
    });
    state.cleanupRoom = state.room.destroy;
    return;
  }

  if (route.name === 'report') {
    app.innerHTML = shell('history', `<div id="report-root"><main class="page report-loading"><div class="loading-block">${spinner(
      'Loading report'
    )}<p>Opening your conversation...</p></div></main></div>`);
    renderReport(document.getElementById('report-root'), {
      sessionId: route.id,
      getSettings: () => state.settings,
      toast,
      onRestart(session) {
        const scene = session.scene;
        if (!scene) {
          navigate('');
          return;
        }
        openSetup(scene);
      },
      onHome() {
        navigate('');
      },
      onHistory() {
        navigate('history');
      },
      onSettings() {
        openSettings('ai');
      }
    });
    return;
  }

  if (route.name === 'history') {
    app.innerHTML = historyView();
    bindHistory(app);
    window.scrollTo(0, scroll);
    return;
  }

  if (route.name === 'vocab') {
    app.innerHTML = vocabView();
    bindVocab(app);
    window.scrollTo(0, scroll);
    return;
  }

  app.innerHTML = homeView();
  window.scrollTo(0, scroll);
}

document.addEventListener('click', async (event) => {
  const nav = event.target.closest('[data-nav]');
  if (nav) {
    event.preventDefault();
    navigate(nav.dataset.nav);
    return;
  }

  const deleteCustom = event.target.closest('[data-delete-custom-scene]');
  if (deleteCustom) {
    event.preventDefault();
    event.stopPropagation();
    const scene = customScenes().find((item) => item.id === deleteCustom.dataset.deleteCustomScene);
    const confirmed = await confirmDialog({
      title: 'Remove this saved scene?',
      message: `“${scene?.title || 'This scene'}” will be removed from your collection. Past conversation reports are not affected.`,
      confirmLabel: 'Remove scene',
      danger: true
    });
    if (confirmed) {
      store.removeCustomScene(deleteCustom.dataset.deleteCustomScene);
      toast('Saved scene removed.');
      renderRoute();
    }
    return;
  }

  const setup = event.target.closest('[data-open-setup]');
  if (setup) {
    event.preventDefault();
    openSetup(findScene(setup.dataset.openSetup));
    return;
  }

  const settings = event.target.closest('[data-open-settings]');
  if (settings) {
    event.preventDefault();
    openSettings('ai');
    return;
  }

  const custom = event.target.closest('[data-open-custom]');
  if (custom) {
    event.preventDefault();
    openCustomScene();
    return;
  }

  const prompt = event.target.closest('[data-open-prompt]');
  if (prompt) {
    event.preventDefault();
    openPrompt(Number(prompt.dataset.openPrompt));
    return;
  }

  const report = event.target.closest('[data-open-report]');
  if (report) {
    event.preventDefault();
    navigate(`report/${report.dataset.openReport}`);
    return;
  }

  const resume = event.target.closest('[data-resume-draft]');
  if (resume) {
    event.preventDefault();
    resumeDraft();
    return;
  }

  const discard = event.target.closest('[data-discard-draft]');
  if (discard) {
    event.preventDefault();
    discardDraft();
    return;
  }

  const scrollTo = event.target.closest('[data-scroll-to]');
  if (scrollTo) {
    event.preventDefault();
    document.getElementById(scrollTo.dataset.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

window.addEventListener('hashchange', () => renderRoute());

document.addEventListener('visibilitychange', () => {
  if (document.hidden) tts.cancel();
});

window.addEventListener('beforeunload', () => {
  tts.cancel();
});

state.settings = store.getSettings();
if (!location.hash) location.hash = '#/';
renderRoute();
