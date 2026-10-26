import { getDifficulty, getWorld } from './data.js';
import { requestReport } from './api.js';
import { icon } from './icons.js';
import { tts } from './speech.js';
import { store } from './store.js';
import {
  esc,
  formatDate,
  formatMinutes,
  scoreLabel,
  scoreTone,
  spinner
} from './ui.js';

const analysisInFlight = new Set();

function wordsOf(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function localCorrections(session) {
  const notes = (session.coachNotes || []).map((note) => ({
    original: note.original,
    better: note.better,
    why_zh: note.why || ''
  }));
  const checks = [
    { re: /\bI am agree\b/gi, better: 'I agree', why: 'agree 本身是动词，不需要 am。' },
    { re: /\bI very (like|love)\b/gi, better: 'I really $1', why: 'very 不直接修饰动词，really 更自然。' },
    { re: /\bmore better\b/gi, better: 'better', why: 'better 已经是比较级，不需要 more。' },
    { re: /\bI didn't went\b/gi, better: "I didn't go", why: 'didn’t 后面用动词原形。' }
  ];
  for (const message of session.messages || []) {
    if (message.role !== 'user' || message.kind === 'help') continue;
    for (const check of checks) {
      if (check.re.test(message.text)) {
        const corrected = message.text.replace(check.re, check.better);
        if (!notes.some((note) => note.original === message.text)) {
          notes.push({ original: message.text, better: corrected, why_zh: check.why });
        }
      }
      check.re.lastIndex = 0;
    }
  }
  return notes.slice(0, 5);
}

export function buildLocalReport(session) {
  const stats = session.stats || {};
  const turns = stats.turns || 0;
  const words = stats.userWords || 0;
  const unique = stats.uniqueWords || 0;
  const minutes = Math.max(1, Math.round((stats.durationSeconds || 0) / 60));
  const averageWords = turns ? words / turns : 0;
  const level = getDifficulty(session.config?.difficulty);
  const corrections = localCorrections(session);
  const usedHelp = (session.messages || []).some((message) => message.role === 'user' && message.kind === 'help');

  const levelBonus = level.id === 'fluent' || level.id === 'expert' ? 4 : 0;
  const scores = {
    fluency: Math.min(94, Math.round(48 + Math.min(30, averageWords * 3.6) + Math.min(12, turns * 1.6) + levelBonus)),
    vocabulary: Math.min(95, Math.round(46 + Math.min(38, unique * 2.1) + levelBonus)),
    grammar: Math.min(92, Math.round(72 + levelBonus - Math.min(16, corrections.length * 4))),
    confidence: Math.min(96, Math.round(52 + Math.min(32, turns * 3.4) + Math.min(10, words / 8)))
  };
  const overall = Math.round((scores.fluency + scores.vocabulary + scores.grammar + scores.confidence) / 4);
  const wins = [];
  if (turns >= 1) wins.push('你完成了至少一轮真实的英文回应——这比“准备好再开口”更重要。');
  if (turns >= 3) wins.push('你让对话持续了下去，而不是停在单个单词或句子里。');
  if (averageWords >= 8) wins.push('你愿意把回答展开，给出了让对方可以接住的信息。');
  if (usedHelp) wins.push('你卡住时主动求助，并且回到了英文对话，而不是直接放弃。');
  if (!wins.length) wins.push('你打开了房间。下一步，只需要说出一句完整的英文。');

  const focus = [];
  if (averageWords < 8) focus.push('下一次，在每个回答后多加一个理由：用 because 或 for example 把句子延长。');
  if (unique < 25) focus.push('刻意换用两三个同义词，让表达不只停在最熟悉的词上。');
  if (corrections.length) focus.push('挑一条今天的纠正，在下一场对话里主动用一次。');
  if (!focus.length) focus.push('把字幕关掉一轮，训练自己抓关键词，而不是逐字翻译。');

  const phrases = (session.scene?.phrases || []).slice(0, 4).map((phrase) => ({ en: phrase.en, zh: phrase.zh }));

  return {
    source: 'local',
    overall,
    scores,
    headline: turns >= 3 ? 'You stayed in the room.' : 'You opened the door.',
    summary:
      turns > 0
        ? `这场对话持续了 ${minutes} 分钟，你完成了 ${turns} 轮英文回应，一共说了 ${words} 个英文词。${
            corrections.length ? '下面有几处具体可以更自然的地方。' : '这次没有明显需要打断你的错误。'
          }`
        : '这场对话还没有真正的英文回应，所以这只是一份基础记录。下一次，先试着说一句完整的句子。',
    wins: wins.slice(0, 3),
    focus: focus.slice(0, 2),
    corrections,
    phrases,
    generatedAt: new Date().toISOString(),
    phrasesSaved: false
  };
}

function mergeCoachNotes(report, session) {
  const list = Array.isArray(report.corrections) ? [...report.corrections] : [];
  for (const note of session.coachNotes || []) {
    if (!note?.original || !note?.better) continue;
    if (!list.some((item) => item.original === note.original && item.better === note.better)) {
      list.push({ original: note.original, better: note.better, why_zh: note.why || '' });
    }
  }
  return list.slice(0, 6);
}

function persistPhrases(session, report) {
  if (!report || report.phrasesSaved) return report;
  const count = store.addVocab(report.phrases || [], session.scene?.title || 'Conversation');
  report.phrasesSaved = true;
  report.phrasesAdded = count;
  return report;
}

async function analyseSession(session, settings) {
  let report;
  let error = null;
  if (store.isConfigured(settings)) {
    try {
      report = await requestReport({ session, settings });
    } catch (requestError) {
      error = requestError;
    }
  }
  if (!report) {
    report = buildLocalReport(session);
    if (error) report.analysisError = error.message;
  }
  report = { ...report, corrections: mergeCoachNotes(report, session) };
  report = persistPhrases(session, report);
  session.report = report;
  session.status = 'complete';
  session.completedAt = new Date().toISOString();
  store.saveSession(session);
  return session;
}

function scoreRing(report) {
  const score = report.overall;
  return `<div class="score-ring is-${scoreTone(score)}" style="--score:${score}">
    <div class="score-ring-inner">
      <strong>${score}</strong>
      <span>${scoreLabel(score)}</span>
    </div>
  </div>`;
}

function metric(label, value, hint) {
  return `<div class="metric">
    <div class="metric-head"><span>${label}<small>${hint}</small></span><strong>${value}</strong></div>
    <div class="metric-track"><span class="is-${scoreTone(value)}" style="--value:${value}%"></span></div>
  </div>`;
}

function transcriptMarkup(session) {
  return (session.messages || [])
    .filter((message) => message.text && message.role !== 'system' && message.kind !== 'error')
    .map((message) => {
      if (message.role === 'assistant') {
        if (message.kind === 'help') {
          return `<div class="transcript-line ai help"><span class="transcript-role">${esc(session.scene?.aiName || 'Partner')} · 中文求助</span><p>${esc(
            message.text
          )}</p>${message.followup ? `<p class="transcript-followup">${esc(message.followup)}</p>` : ''}</div>`;
        }
        return `<div class="transcript-line ai"><span class="transcript-role">${esc(session.scene?.aiName || 'Partner')}</span><p>${esc(
          message.text
        )}</p></div>`;
      }
      return `<div class="transcript-line user"><span class="transcript-role">You</span><p>${esc(message.text)}</p></div>`;
    })
    .join('');
}

function reportMarkup(session) {
  const report = session.report;
  const world = getWorld(session.scene?.world);
  const difficulty = getDifficulty(session.config?.difficulty);
  const stats = session.stats || {};
  const duration = formatMinutes(stats.durationSeconds || 0);
  const date = formatDate(session.endedAt || session.startedAt);
  const sourceLabel = report.source === 'ai' ? 'AI coach report' : 'Local coach summary';
  const corrections = report.corrections || [];
  const wins = report.wins || [];
  const focus = report.focus || [];
  const phrases = report.phrases || [];
  const hasHelp = (session.messages || []).some((message) => message.role === 'user' && message.kind === 'help');
  const metaChips = [
    `${icon('clock')} ${duration}`,
    `${icon('message')} ${stats.turns || 0} ${(stats.turns || 0) === 1 ? 'turn' : 'turns'}`,
    `${icon('chart')} ${stats.userWords || 0} words`,
    `${icon('graduation')} ${difficulty.label}`,
    hasHelp ? `${icon('lifebuoy')} lifeline used` : `${icon('globe')} stayed in English`
  ];

  return `<main class="page report-page">
    <div class="report-topline">
      <button class="text-link" data-report-home>${icon('arrow-left')} Back home</button>
      <span class="report-source">${icon(report.source === 'ai' ? 'sparkles' : 'shield')} ${sourceLabel}</span>
      <button class="text-link" data-report-history>Journal ${icon('arrow-right')}</button>
    </div>

    <section class="report-hero">
      <div class="report-hero-copy">
        <p class="eyebrow">Session complete · ${esc(date)}</p>
        <h1>${esc(report.headline || 'You held the room.')}</h1>
        <p class="report-summary">${esc(report.summary || '')}</p>
        <div class="report-meta">${metaChips.map((chip) => `<span>${chip}</span>`).join('')}</div>
        <div class="report-actions">
          <button class="btn btn-primary" data-report-restart>Practice this scene again ${icon('refresh')}</button>
          <button class="btn btn-ghost" data-report-home>Find a new room ${icon('arrow-right')}</button>
        </div>
        ${
          report.source === 'local'
            ? `<div class="report-local-note">${icon('sparkles')} <span>${
                report.analysisError
                  ? `The AI analysis could not complete: ${esc(report.analysisError)}. This is a local summary.`
                  : 'This is a local summary. Connect your AI model for a deeper coach report.'
              }</span><button class="text-link" data-open-settings>Connect AI ${icon('arrow-right')}</button></div>`
            : ''
        }
      </div>
      <div class="report-score-block">
        ${scoreRing(report)}
        <p>Overall speaking score</p>
        <span class="score-caption">${esc(scoreLabel(report.overall))} · ${esc(report.source === 'ai' ? 'AI-reviewed' : 'self-tracked')}</span>
      </div>
    </section>

    <section class="report-dashboard">
      <div class="report-main">
        <div class="report-section">
          <div class="report-section-head">
            <p class="eyebrow">The numbers</p>
            <h2>Four dimensions,<br /><em>one real conversation.</em></h2>
          </div>
          <div class="metrics-grid">
            ${metric('Fluency', report.scores.fluency, 'keeping the thread')}
            ${metric('Vocabulary', report.scores.vocabulary, 'range and choice')}
            ${metric('Grammar', report.scores.grammar, 'control under pressure')}
            ${metric('Confidence', report.scores.confidence, 'willingness to extend')}
          </div>
        </div>

        <div class="report-section two-col-section">
          <div class="feedback-card wins-card">
            <div class="feedback-head"><span>${icon('check')}</span><h3>What worked</h3></div>
            <ul>${wins.map((item) => `<li>${esc(item)}</li>`).join('') || '<li>You showed up. That counts.</li>'}</ul>
          </div>
          <div class="feedback-card focus-card">
            <div class="feedback-head"><span>${icon('target')}</span><h3>What to practise next</h3></div>
            <ul>${focus.map((item) => `<li>${esc(item)}</li>`).join('') || '<li>Keep the same energy and add one detail next time.</li>'}</ul>
          </div>
        </div>

        <div class="report-section">
          <div class="report-section-head inline-head">
            <div><p class="eyebrow">Corrections</p><h2>Small shifts,<br /><em>more natural English.</em></h2></div>
            <span class="section-count">${corrections.length} note${corrections.length === 1 ? '' : 's'}</span>
          </div>
          <div class="correction-list">
            ${
              corrections.length
                ? corrections
                    .map(
                      (note, index) => `<article class="correction-card">
                        <span class="correction-index">${String(index + 1).padStart(2, '0')}</span>
                        <div class="correction-body">
                          <div class="correction-row">
                            <span class="correction-label">You said</span>
                            <p class="original">${esc(note.original)}</p>
                          </div>
                          <div class="correction-row better">
                            <span class="correction-label">Try</span>
                            <p>${esc(note.better)}</p>
                            <button class="icon-btn tiny" data-report-speak="${esc(note.better)}" aria-label="Hear the better version">${icon('volume')}</button>
                          </div>
                          ${note.why_zh ? `<p class="correction-why">${esc(note.why_zh)}</p>` : ''}
                        </div>
                      </article>`
                    )
                    .join('')
                : `<div class="empty-inline">${icon('sparkles')} <p>No major corrections this time. That is worth noticing — not every conversation needs fixing.</p></div>`
            }
          </div>
        </div>

        <div class="report-section">
          <div class="report-section-head inline-head">
            <div><p class="eyebrow">Keep these</p><h2>Phrases that<br /><em>earned their place.</em></h2></div>
            <span class="section-count">Saved to your word bank</span>
          </div>
          <div class="report-phrases">
            ${phrases
              .map(
                (phrase) => `<div class="report-phrase">
                  <div><strong>${esc(phrase.en)}</strong><span>${esc(phrase.zh || '')}</span></div>
                  <button class="icon-btn small" data-report-speak="${esc(phrase.en)}" aria-label="Hear phrase">${icon('volume')}</button>
                </div>`
              )
              .join('')}
          </div>
        </div>

        <details class="transcript-block">
          <summary><span>Read the full transcript</span><small>${(session.messages || []).filter((message) => message.text).length} messages</small>${icon('chevron-down')}</summary>
          <div class="transcript-body">${transcriptMarkup(session)}</div>
        </details>
      </div>

      <aside class="report-aside">
        <div class="report-scene-card">
          <div class="report-scene-art" data-world="${esc(world.id)}">
            <span class="report-scene-icon">${icon(
              world.id === 'daily' ? 'coffee' : world.id === 'campus' ? 'graduation' : world.id === 'play' ? 'film' : 'compass'
            )}</span>
            <span>${esc(world.name)}</span>
          </div>
          <div class="report-scene-body">
            <p class="eyebrow">The room</p>
            <h3>${esc(session.scene?.title || 'Conversation')}</h3>
            <p>${esc(session.scene?.setting || '')}</p>
            <div class="report-partner"><span>Partner</span><strong>${esc(session.scene?.aiName || '—')}</strong><small>${esc(
              session.scene?.aiRole || ''
            )}</small></div>
          </div>
        </div>
        <div class="report-stats-card">
          <div><span>Duration</span><strong>${duration}</strong></div>
          <div><span>Turns</span><strong>${stats.turns || 0}</strong></div>
          <div><span>Words</span><strong>${stats.userWords || 0}</strong></div>
          <div><span>Unique words</span><strong>${stats.uniqueWords || 0}</strong></div>
        </div>
        <button class="aside-action" data-report-restart><span>${icon('refresh')} Run this scene again</span>${icon('arrow-right')}</button>
        <button class="aside-action" data-report-history><span>${icon('history')} See all sessions</span>${icon('arrow-right')}</button>
        <p class="aside-fineprint">${icon('lock')} This report is stored only in your browser.</p>
      </aside>
    </section>
  </main>`;
}

function loadingMarkup(session) {
  return `<main class="page report-loading">
    <button class="text-link" data-report-home>${icon('arrow-left')} Back home</button>
    <div class="analysis-card">
      <div class="analysis-orb"><span></span><span></span><span></span></div>
      <p class="eyebrow">Session complete</p>
      <h1>Reading the room.</h1>
      <p>Your coach is listening back to ${esc(session.scene?.title || 'the conversation')} and picking out what mattered.</p>
      <div class="analysis-steps">
        <span class="is-done">${icon('check')} Transcript captured</span>
        <span class="is-active">${spinner()} Finding patterns</span>
        <span>Writing your next steps</span>
      </div>
    </div>
  </main>`;
}

function bindReport(root, session, options) {
  root.onclick = (event) => {
    const restart = event.target.closest('[data-report-restart]');
    if (restart) {
      options.onRestart?.(session);
      return;
    }
    if (event.target.closest('[data-report-home]')) {
      options.onHome?.();
      return;
    }
    if (event.target.closest('[data-report-history]')) {
      options.onHistory?.();
      return;
    }
    const speak = event.target.closest('[data-report-speak]');
    if (speak) {
      tts.speak(speak.dataset.reportSpeak, {
        lang: 'en-US',
        rate: 0.92,
        voiceURI: options.getSettings().voiceURI || 'auto'
      });
    }
  };
}

export async function renderReport(root, options) {
  const session = store.getSession(options.sessionId);
  if (!session) {
    root.innerHTML = `<main class="page report-loading">
      <div class="empty-state">
        <span class="empty-icon">${icon('search')}</span>
        <h3>This report is not here.</h3>
        <p>It may have been deleted with your browser data. Start another conversation and a new report will appear.</p>
        <button class="btn btn-primary" data-report-home>Back home</button>
      </div>
    </main>`;
    root.onclick = (event) => {
      if (event.target.closest('[data-report-home]')) options.onHome?.();
    };
    return;
  }

  if (!session.report && !analysisInFlight.has(session.id)) {
    root.innerHTML = loadingMarkup(session);
    root.onclick = (event) => {
      if (event.target.closest('[data-report-home]')) {
        options.onHome?.();
      }
    };
    analysisInFlight.add(session.id);
    try {
      await analyseSession(session, options.getSettings());
    } catch (error) {
      const fallback = buildLocalReport(session);
      fallback.analysisError = error.message;
      session.report = persistPhrases(session, fallback);
      session.status = 'complete';
      store.saveSession(session);
      options.toast?.('The AI report failed, so a local summary was saved.', { type: 'error' });
    } finally {
      analysisInFlight.delete(session.id);
    }
    const updated = store.getSession(session.id);
    if (updated) {
      root.innerHTML = reportMarkup(updated);
      bindReport(root, updated, options);
    }
    return;
  }

  if (!session.report) {
    root.innerHTML = loadingMarkup(session);
    return;
  }

  if (!session.report.phrasesSaved) {
    session.report = persistPhrases(session, session.report);
    store.saveSession(session);
  }

  root.innerHTML = reportMarkup(session);
  bindReport(root, session, options);
}
