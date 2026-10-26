import { getAccent, getDifficulty, getPace, getSubtitle, getWorld } from './data.js';
import { requestReply } from './api.js';
import { icon } from './icons.js';
import { SPEECH_ERRORS, stt, tts } from './speech.js';
import { store } from './store.js';
import { esc, formatClock, formatMinutes, toast as defaultToast } from './ui.js';

const CHINESE_RE = /[\u3400-\u9fff]/;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timeLabel(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function wordsOf(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function estimateSeconds(text) {
  const count = wordsOf(text).length;
  return Math.max(2, Math.round((count / 2.6) * 1.2));
}

function waveformBars(count = 18, className = '') {
  return Array.from({ length: count }, (_, index) => {
    const height = 18 + ((index * 29 + 13) % 68);
    return `<span class="${className}" style="--h:${height}%;--d:${(index * 0.055).toFixed(2)}s"></span>`;
  }).join('');
}

function defaultSuggestions(scene) {
  const phrases = (scene.phrases || []).map((phrase) => phrase.en);
  return [...phrases, 'Could you tell me a little more about that?'].slice(0, 3);
}

function demoCoach(text) {
  const checks = [
    { re: /\bI am agree\b/i, better: 'I agree', why: 'agree 本身是动词，不需要再加 am。' },
    { re: /\bI very (like|love)\b/i, better: 'I really $1', why: 'very 一般不直接修饰动词，really 更自然。' },
    { re: /\bmore better\b/i, better: 'better', why: 'better 已经是比较级，不需要再加 more。' },
    { re: /\bHow to say\b/i, better: 'How do you say ...?', why: '问“怎么说”更自然的句式是 How do you say ...?' },
    { re: /\bI didn't went\b/i, better: "I didn't go", why: 'didn’t 后面用动词原形。' }
  ];
  for (const check of checks) {
    if (check.re.test(text)) {
      return {
        original: text,
        better: text.replace(check.re, check.better),
        why: check.why
      };
    }
  }
  return null;
}

class Room {
  constructor(root, options) {
    this.root = root;
    this.options = options;
    document.body.classList.add('room-mode');
    this.session = options.session;
    this.scene = this.session.scene;
    this.config = this.session.config || {};
    this.settings = options.getSettings();
    this.toast = options.toast || defaultToast;
    this.world = getWorld(this.scene.world);
    this.difficulty = getDifficulty(this.config.difficulty);
    this.accent = getAccent(this.config.accent);
    this.pace = getPace(this.config.pace);
    this.subtitle = getSubtitle(this.config.subtitle);
    this.elapsed = Math.max(0, Number(this.session.stats?.durationSeconds) || 0);
    this.durationSeconds = Math.max(0, Number(this.config.duration) || 0) * 60;
    this.voiceEnabled = this.settings.autoSpeak !== false;
    this.busy = false;
    this.thinking = false;
    this.listening = false;
    this.helpMode = false;
    this.speaking = false;
    this.destroyed = false;
    this.ending = false;
    this.demoNudged = false;
    this.showSuggestions = false;
    this.suggestions = Array.isArray(this.session.suggestions) ? this.session.suggestions : defaultSuggestions(this.scene);
    this.coachNotes = Array.isArray(this.session.coachNotes) ? this.session.coachNotes : [];
    this.speakSeq = 0;
    this.timers = [];
    this.silenceTimer = null;
    this.timer = null;
    this.warnedTime = this.durationSeconds > 0 && this.elapsed >= this.durationSeconds;
    this.documentClick = this.onDocumentClick.bind(this);
    this.renderShell();
    this.bind();
    this.renderMessages();
    this.renderInsight();
    this.updateTimer(true);
    this.startTimer();
    this.setStatus('idle');
    this.scrollToBottom(true);
    if (this.voiceEnabled && this.session.messages.length === 1) {
      this.timers.push(setTimeout(() => this.replayLast(true), 500));
    }
  }

  $(selector) {
    return this.root.querySelector(selector);
  }

  renderShell() {
    const initial = (this.scene.aiName || 'A').slice(0, 1).toUpperCase();
    const ccLabel = this.subtitle.id === 'none' ? 'Off' : this.subtitle.id === 'bilingual' ? '双语' : 'EN';
    const configured = store.isConfigured(this.settings);
    const durationLabel = this.durationSeconds ? `${Math.round(this.durationSeconds / 60)}:00` : 'open';
    this.root.innerHTML = `<div class="room" data-subtitle="${this.subtitle.id}">
      <header class="room-top">
        <div class="room-top-left">
          <button class="room-back" data-room-back aria-label="Leave the room">${icon('arrow-left')}</button>
          <div class="room-title">
            <span class="room-kicker">${esc(this.world.name)} · ${this.difficulty.label}</span>
            <strong>${esc(this.scene.title)}</strong>
          </div>
        </div>
        <div class="room-top-right">
          ${configured ? '' : `<button class="demo-pill" data-need-api><i></i> Demo</button>`}
          <div class="room-timer" data-timer-box><span data-timer>${formatClock(this.elapsed)}</span><small>/ ${durationLabel}</small></div>
          <button class="room-icon" data-toggle-voice aria-label="${this.voiceEnabled ? 'Mute partner voice' : 'Unmute partner voice'}">
            ${icon(this.voiceEnabled ? 'volume' : 'volume-off')}
          </button>
          <div class="cc-wrap">
            <button class="room-icon cc-button" data-toggle-cc aria-expanded="false" aria-label="Subtitle mode">
              ${icon('cc')}<small data-cc-label>${ccLabel}</small>
            </button>
            <div class="cc-menu" data-cc-menu hidden>
              <span class="cc-menu-title">Subtitles</span>
              <button data-set-cc="none" class="${this.subtitle.id === 'none' ? 'is-active' : ''}"><span><strong>No subtitles</strong><small>Pure listening</small></span>${icon('headphones')}</button>
              <button data-set-cc="en" class="${this.subtitle.id === 'en' ? 'is-active' : ''}"><span><strong>English</strong><small>Read every line</small></span>${icon('cc')}</button>
              <button data-set-cc="bilingual" class="${this.subtitle.id === 'bilingual' ? 'is-active' : ''}"><span><strong>English + 中文</strong><small>Quiet translation</small></span>${icon('globe')}</button>
            </div>
          </div>
          <button class="room-icon mobile-only" data-toggle-insight aria-label="Open coach panel">${icon('layers')}</button>
          <button class="end-session" data-end-session>End</button>
        </div>
      </header>
      <div class="room-body">
        <main class="conversation">
          <div class="ai-stage">
            <div class="orb-wrap">
              <span class="orb-ring ring-one"></span>
              <span class="orb-ring ring-two"></span>
              <button class="stage-orb" data-orb data-replay-last aria-label="Replay the last line">
                <span class="orb-shine"></span><span class="orb-letter">${esc(initial)}</span>
              </button>
            </div>
            <div class="stage-copy">
              <strong>${esc(this.scene.aiName)}</strong>
              <span data-status>Getting ready...</span>
            </div>
            <div class="stage-wave" data-wave aria-hidden="true">${waveformBars(24)}</div>
            <span class="stage-role">${esc(this.scene.userRole)}</span>
            <button class="stage-replay" data-replay-last>${icon('replay')} <span>Replay</span></button>
          </div>
          <div class="messages" data-messages aria-live="polite"></div>
          <div class="composer-area">
            <div class="lifeline-banner" data-lifeline hidden>
              <div class="lifeline-copy">
                <strong>${icon('lifebuoy')} Chinese lifeline is on</strong>
                <span>Ask in Chinese. You'll get a short explanation, then one English line to get back in.</span>
              </div>
              <div class="lifeline-actions">
                <button class="mini-action" data-help-last>Explain the last line</button>
                <button class="mini-action quiet" data-help-cancel>Back to English</button>
              </div>
            </div>
            <div class="suggestion-tray" data-suggestions hidden>
              <span class="suggestion-label">${icon('sparkles')} Try saying</span>
              <div class="suggestion-list" data-suggestion-list></div>
            </div>
            <form class="composer" data-composer>
              <button type="button" class="lifeline-btn" data-lifeline-toggle>
                ${icon('lifebuoy')}<span>I'm lost</span>
              </button>
              <input class="room-input" data-input type="text" placeholder="Type in English..." autocomplete="off" autocapitalize="sentences" spellcheck="false" aria-label="Your message" />
              <button type="button" class="hint-btn" data-hint aria-label="Show suggestions">
                ${icon('sparkles')}<span>Hint</span>
              </button>
              <button type="submit" class="send-btn" data-send disabled aria-label="Send message">${icon('arrow-up')}</button>
              <button type="button" class="mic-btn" data-mic aria-label="Start speaking">${icon('mic')}</button>
            </form>
            <div class="composer-meta">
              <span data-mode-hint>Speak or type. English only.</span>
              <span class="mic-note" data-mic-note>${stt.supported ? 'Mic ready' : 'Type only · no speech API'}</span>
            </div>
          </div>
        </main>
        <aside class="insight" data-insight>
          <div class="insight-head">
            <span class="insight-title"><i></i> Live coach</span>
            <button class="icon-btn small mobile-only" data-close-insight aria-label="Close coach panel">${icon('close')}</button>
          </div>
          <section class="insight-section">
            <p class="eyebrow">Your mission</p>
            <ul class="mission-list">
              ${(this.scene.goals || [])
                .map(
                  (goal, index) => `<li><span class="mission-number">${String(index + 1).padStart(2, '0')}</span><span>${esc(goal)}</span></li>`
                )
                .join('')}
            </ul>
          </section>
          <section class="insight-section">
            <p class="eyebrow">Coach's notes</p>
            <div class="coach-notes" data-coach></div>
          </section>
          <section class="insight-section">
            <p class="eyebrow">Phrases to steal</p>
            <div class="phrase-list" data-phrases>
              ${(this.scene.phrases || [])
                .map(
                  (phrase) => `<button class="phrase-item" data-speak-phrase="${esc(phrase.en)}">
                    <span>${esc(phrase.en)}</span><small>${esc(phrase.zh)}</small>
                    <i>${icon('volume')}</i>
                  </button>`
                )
                .join('')}
            </div>
          </section>
          <section class="room-stats">
            <div><span>Turns</span><strong data-stat-turns>0</strong></div>
            <div><span>Words</span><strong data-stat-words>0</strong></div>
            <div><span>Time</span><strong data-stat-time>0m</strong></div>
          </section>
        </aside>
      </div>
    </div>`;

    this.messagesEl = this.$('[data-messages]');
    this.input = this.$('[data-input]');
    this.form = this.$('[data-composer]');
    this.sendBtn = this.$('[data-send]');
    this.micBtn = this.$('[data-mic]');
    this.statusEl = this.$('[data-status]');
    this.orb = this.$('[data-orb]');
    this.waveEl = this.$('[data-wave]');
    this.timerEl = this.$('[data-timer]');
    this.timerBox = this.$('[data-timer-box]');
    this.lifelineBanner = this.$('[data-lifeline]');
    this.suggestionsEl = this.$('[data-suggestions]');
    this.suggestionList = this.$('[data-suggestion-list]');
    this.ccMenu = this.$('[data-cc-menu]');
    this.ccLabel = this.$('[data-cc-label]');
    this.insight = this.$('[data-insight]');
  }

  bind() {
    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.input.addEventListener('input', () => this.updateComposer());
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        if (event.isComposing) return;
        event.preventDefault();
        this.submitFromForm();
      }
    });
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.submitFromForm();
    });
    document.addEventListener('click', this.documentClick);
  }

  onDocumentClick(event) {
    if (!event.target.closest('.cc-wrap') && this.ccMenu && !this.ccMenu.hidden) {
      this.ccMenu.hidden = true;
      this.$('[data-toggle-cc]')?.setAttribute('aria-expanded', 'false');
    }
  }

  handleClick(event) {
    const target = event.target;
    const end = target.closest('[data-end-session]');
    if (end) {
      this.endSession();
      return;
    }
    const back = target.closest('[data-room-back]');
    if (back) {
      this.leaveRoom();
      return;
    }
    if (target.closest('[data-toggle-voice]')) {
      this.toggleVoice();
      return;
    }
    if (target.closest('[data-toggle-cc]')) {
      const button = target.closest('[data-toggle-cc]');
      this.ccMenu.hidden = !this.ccMenu.hidden;
      button.setAttribute('aria-expanded', String(!this.ccMenu.hidden));
      return;
    }
    const cc = target.closest('[data-set-cc]');
    if (cc) {
      this.setSubtitle(cc.dataset.setCc);
      return;
    }
    if (target.closest('[data-toggle-insight]')) {
      this.insight.classList.add('is-open');
      this.root.querySelector('.room')?.classList.add('insight-open');
      return;
    }
    if (target.closest('[data-close-insight]')) {
      this.insight.classList.remove('is-open');
      this.root.querySelector('.room')?.classList.remove('insight-open');
      return;
    }
    if (target.closest('[data-mic]')) {
      this.toggleListening();
      return;
    }
    if (target.closest('[data-lifeline-toggle]')) {
      if (this.helpMode) this.disableHelp();
      else this.enableHelp();
      return;
    }
    if (target.closest('[data-help-cancel]')) {
      this.disableHelp();
      return;
    }
    if (target.closest('[data-help-last]')) {
      this.enableHelp();
      this.sendText('请用中文解释你刚才那句话，并给我一个简单的英文回答提示。', 'help');
      return;
    }
    if (target.closest('[data-hint]')) {
      this.toggleSuggestions();
      return;
    }
    const suggestion = target.closest('[data-suggestion]');
    if (suggestion) {
      this.input.value = suggestion.dataset.suggestion;
      this.showSuggestions = false;
      this.renderSuggestions();
      this.updateComposer();
      this.input.focus();
      return;
    }
    const replay = target.closest('[data-replay-message]');
    if (replay) {
      this.replayMessage(replay.dataset.replayMessage);
      return;
    }
    if (target.closest('[data-replay-last]')) {
      this.replayLast();
      return;
    }
    const phrase = target.closest('[data-speak-phrase]');
    if (phrase) {
      this.speakEnglish(phrase.dataset.speakPhrase);
      return;
    }
    if (target.closest('[data-need-api]')) {
      this.options.onNeedApi?.();
      return;
    }
    if (target.closest('[data-error-settings]')) {
      this.options.onNeedApi?.();
    }
  }

  updateComposer() {
    const text = this.input.value.trim();
    this.sendBtn.disabled = !text || this.busy;
    this.input.placeholder = this.helpMode ? '用中文说你哪里没听懂...' : 'Type in English...';
    const modeHint = this.$('[data-mode-hint]');
    if (this.helpMode) {
      modeHint.textContent = '中文求助已开启 · 解释后会立刻回到英文';
    } else if (this.subtitle.id === 'none') {
      modeHint.textContent = 'Audio-only room · captions hidden';
    } else {
      modeHint.textContent = 'Speak or type. English only.';
    }
    if (!stt.supported) {
      this.$('[data-mic-note]').textContent = 'Type only · no speech API';
    }
  }

  submitFromForm() {
    if (this.busy) {
      this.toast('Your partner is still replying. Give it a second.', { type: 'info' });
      return;
    }
    const text = this.input.value.trim();
    if (!text) return;
    this.sendText(text, 'text');
  }

  setStatus(mode) {
    const labels = {
      idle: stt.supported ? 'Your turn · tap the mic' : 'Your turn · type your reply',
      listening: 'Listening... tap to finish',
      thinking: 'Thinking...',
      speaking: 'Speaking...',
      help: 'Chinese lifeline is on'
    };
    if (this.statusEl) this.statusEl.textContent = labels[mode] || labels.idle;
    const room = this.$('.room');
    if (room) room.dataset.state = mode;
    if (this.orb) this.orb.dataset.state = mode;
    if (this.waveEl) this.waveEl.dataset.state = mode;
  }

  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled;
    const button = this.$('[data-toggle-voice]');
    if (button) {
      button.innerHTML = icon(this.voiceEnabled ? 'volume' : 'volume-off');
      button.setAttribute('aria-label', this.voiceEnabled ? 'Mute partner voice' : 'Unmute partner voice');
    }
    if (!this.voiceEnabled) {
      this.speakSeq += 1;
      tts.cancel();
      if (this.speaking) {
        this.speaking = false;
        this.setStatus('idle');
      }
      this.toast('Partner voice muted. You can still replay any line.');
    } else {
      this.toast('Partner voice on.');
    }
  }

  setSubtitle(mode) {
    if (!['none', 'en', 'bilingual'].includes(mode)) return;
    this.subtitle = getSubtitle(mode);
    this.config.subtitle = mode;
    this.session.config.subtitle = mode;
    this.root.querySelector('.room').dataset.subtitle = mode;
    this.ccLabel.textContent = mode === 'none' ? 'Off' : mode === 'bilingual' ? '双语' : 'EN';
    this.ccMenu.hidden = true;
    this.$('[data-toggle-cc]')?.setAttribute('aria-expanded', 'false');
    this.ccMenu.querySelectorAll('[data-set-cc]').forEach((button) => button.classList.toggle('is-active', button.dataset.setCc === mode));
    this.renderMessages();
    this.updateComposer();
    this.options.onSessionChange(this.session);
    if (mode === 'none') this.toast('Subtitles off. Listen for the shape of the sentence, not every word.');
  }

  toggleSuggestions() {
    if (!this.suggestions?.length) this.suggestions = defaultSuggestions(this.scene);
    this.showSuggestions = !this.showSuggestions;
    this.renderSuggestions();
  }

  renderSuggestions() {
    if (!this.suggestionsEl) return;
    this.suggestionsEl.hidden = !this.showSuggestions;
    if (!this.showSuggestions) return;
    this.suggestionList.innerHTML = this.suggestions
      .map((suggestion) => `<button type="button" class="suggestion-chip" data-suggestion="${esc(suggestion)}">${esc(suggestion)}</button>`)
      .join('');
  }

  computeStats() {
    const userMessages = this.session.messages.filter((message) => message.role === 'user' && message.kind !== 'help');
    const aiMessages = this.session.messages.filter((message) => message.role === 'assistant');
    const allUserText = userMessages.map((message) => message.text).join(' ');
    const words = wordsOf(allUserText);
    const unique = new Set((allUserText.toLowerCase().match(/[a-z']+/g) || []).filter((word) => word.length > 2)).size;
    return {
      turns: userMessages.length,
      userWords: words.length,
      aiWords: aiMessages.reduce((sum, message) => sum + wordsOf(message.text).length, 0),
      uniqueWords: unique,
      messages: this.session.messages.length,
      durationSeconds: this.elapsed
    };
  }

  syncSession() {
    this.session.stats = this.computeStats();
    this.session.suggestions = this.suggestions;
    this.session.coachNotes = this.coachNotes;
    this.options.onSessionChange(this.session);
  }

  addMessage(message) {
    this.session.messages.push(message);
    this.syncSession();
    this.renderMessages();
    this.renderInsight();
    this.updateComposer();
  }

  renderMessages(forceScroll = false) {
    const room = this.$('.room');
    const audioOnly = this.config.subtitle === 'none';
    const wasNearBottom =
      !this.messagesEl ||
      this.messagesEl.scrollHeight - this.messagesEl.scrollTop - this.messagesEl.clientHeight < 160;
    const html = ['<div class="messages-spacer" aria-hidden="true"></div>'];

    for (const message of this.session.messages) {
      if (!message || !message.text) continue;
      if (message.role === 'system' || message.kind === 'error') {
        html.push(`<div class="message system">
          <div class="system-card">
            <span class="system-icon">${icon('alert-circle')}</span>
            <div><strong>Your model didn't answer.</strong><p>${esc(message.text)}</p><button class="text-link" data-error-settings>Open model settings ${icon('arrow-right')}</button></div>
          </div>
        </div>`);
        continue;
      }

      if (message.role === 'assistant' && message.kind === 'help') {
        html.push(`<div class="message ai help">
          <div class="msg-avatar">${esc((this.scene.aiName || 'A').slice(0, 1).toUpperCase())}</div>
          <div class="msg-stack">
            <div class="msg-meta"><strong>${esc(this.scene.aiName)}</strong><span class="help-badge">${icon('lifebuoy')} 中文求助</span><time>${timeLabel(message.ts)}</time></div>
            <div class="bubble help-bubble">
              <span class="lifeline-label">${icon('lifebuoy')} Chinese lifeline</span>
              <p class="help-text">${esc(message.text)}</p>
              ${
                message.followup
                  ? `<div class="help-followup"><span>Say it in English</span><p>${esc(message.followup)}</p></div>`
                  : ''
              }
            </div>
            <div class="msg-tools"><button data-replay-message="${esc(message.id)}">${icon('volume')} Hear it again</button></div>
          </div>
        </div>`);
        continue;
      }

      if (message.role === 'assistant') {
        const isAudioOnly = audioOnly;
        const textBlock = isAudioOnly
          ? `<button class="voice-note" data-replay-message="${esc(message.id)}">
              <span class="voice-note-play">${icon('play')}</span>
              <span class="voice-note-bars">${waveformBars(16)}</span>
              <span class="voice-note-label">Audio only · 0:${String(estimateSeconds(message.text)).padStart(2, '0')}</span>
            </button>`
          : `<p class="bubble-text">${esc(message.text)}</p>
              ${
                this.config.subtitle === 'bilingual' && message.translation
                  ? `<div class="bubble-translation"><span>中文</span><p>${esc(message.translation)}</p></div>`
                  : ''
              }`;
        html.push(`<div class="message ai" data-message-id="${esc(message.id)}">
          <div class="msg-avatar">${esc((this.scene.aiName || 'A').slice(0, 1).toUpperCase())}</div>
          <div class="msg-stack">
            <div class="msg-meta"><strong>${esc(this.scene.aiName)}</strong><span>${esc(this.scene.aiRole)}</span><time>${timeLabel(message.ts)}</time></div>
            <div class="bubble ${isAudioOnly ? 'audio-bubble' : ''}">${textBlock}</div>
            <div class="msg-tools">
              <button data-replay-message="${esc(message.id)}">${icon('replay')} Replay</button>
            </div>
          </div>
        </div>`);
        continue;
      }

      if (message.role === 'user') {
        const isHelp = message.kind === 'help';
        const isAudioOnly = audioOnly && !isHelp;
        const textBlock = isAudioOnly
          ? `<button class="voice-note user-note">
              <span class="voice-note-play">${icon('play')}</span>
              <span class="voice-note-bars">${waveformBars(12)}</span>
              <span class="voice-note-label">You · audio only</span>
            </button>`
          : `<p class="bubble-text">${esc(message.text)}</p>`;
        html.push(`<div class="message user ${isHelp ? 'help-user' : ''}">
          <div class="msg-stack">
            <div class="msg-meta"><time>${timeLabel(message.ts)}</time>${isHelp ? `<span class="help-badge">${icon('lifebuoy')} 中文</span>` : ''}<strong>You</strong></div>
            <div class="bubble ${isAudioOnly ? 'audio-bubble' : ''}">${textBlock}</div>
            ${message.via === 'voice' && !isAudioOnly ? `<div class="msg-tools user-tools"><span>${icon('mic')} voice</span></div>` : ''}
          </div>
        </div>`);
      }
    }

    if (this.pending) {
      html.push(`<div class="message ai typing">
        <div class="msg-avatar">${esc((this.scene.aiName || 'A').slice(0, 1).toUpperCase())}</div>
        <div class="msg-stack"><div class="bubble typing-bubble"><span></span><span></span><span></span></div></div>
      </div>`);
    }

    html.push('<div class="messages-spacer" aria-hidden="true"></div>');

    this.messagesEl.innerHTML = html.join('');
    if (forceScroll || wasNearBottom) this.scrollToBottom();
  }

  renderInsight() {
    const coach = this.$('[data-coach]');
    if (coach) {
      coach.innerHTML = this.coachNotes.length
        ? this.coachNotes
            .slice(-3)
            .reverse()
            .map(
              (note) => `<div class="coach-note">
                <span class="coach-label">You said</span>
                <del>${esc(note.original)}</del>
                <span class="coach-label">Try this</span>
                <strong>${esc(note.better)}</strong>
                ${note.why ? `<p>${esc(note.why)}</p>` : ''}
              </div>`
            )
            .join('')
        : `<div class="coach-empty"><span>${icon('sparkles')}</span><p>Keep talking. I'll only flag what actually matters.</p></div>`;
    }
    this.updateStatsDom();
  }

  updateStatsDom() {
    const stats = this.computeStats();
    const turns = this.$('[data-stat-turns]');
    const words = this.$('[data-stat-words]');
    const time = this.$('[data-stat-time]');
    if (turns) turns.textContent = stats.turns;
    if (words) words.textContent = stats.userWords;
    if (time) time.textContent = formatMinutes(this.elapsed);
  }

  scrollToBottom(force = false) {
    if (!this.messagesEl) return;
    requestAnimationFrame(() => {
      if (!this.messagesEl) return;
      if (force || this.messagesEl.scrollHeight - this.messagesEl.scrollTop - this.messagesEl.clientHeight < 220) {
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      }
    });
  }

  startTimer() {
    this.timer = window.setInterval(() => {
      if (this.destroyed) return;
      this.elapsed += 1;
      this.updateTimer();
      this.updateStatsDom();
      if (this.elapsed % 10 === 0) {
        this.session.stats = { ...this.computeStats(), durationSeconds: this.elapsed };
        this.options.onSessionChange(this.session);
      }
    }, 1000);
  }

  updateTimer(initial = false) {
    if (!this.timerEl) return;
    this.timerEl.textContent = formatClock(this.elapsed);
    const limit = this.durationSeconds;
    if (limit && this.elapsed >= limit) {
      this.timerBox.classList.add('is-over');
      if (!this.warnedTime && !initial) {
        this.warnedTime = true;
        this.toast("Time's up. End when you're ready — or keep the conversation going.", {
          type: 'info',
          duration: 6000
        });
      }
    }
  }

  async sendText(raw, via = 'text') {
    if (this.destroyed) return;
    if (this.busy) {
      this.toast('Your partner is still replying. Give it a second.', { type: 'info' });
      return;
    }
    let text = String(raw || '').trim();
    if (!text && !this.helpMode) return;

    if (CHINESE_RE.test(text) && !this.helpMode) {
      this.enableHelp({ prefill: text });
      this.toast('Chinese is your lifeline. Press send again to ask in Chinese.', {
        type: 'info',
        duration: 5000
      });
      return;
    }

    const wasHelp = this.helpMode;
    if (!text) text = '请用中文解释你刚才那句话，并给我一个简单的英文回答提示。';
    if (this.listening) {
      stt.abort();
      this.setListening(false);
    }
    this.speakSeq += 1;
    tts.cancel();
    this.speaking = false;
    this.disableHelp();
    this.input.value = '';
    this.busy = true;
    this.pending = true;
    this.showSuggestions = false;
    this.renderSuggestions();
    this.setStatus('thinking');
    this.updateComposer();

    this.addMessage({
      id: `m_${Date.now()}_u`,
      role: 'user',
      text,
      ts: new Date().toISOString(),
      via: wasHelp ? 'help' : via,
      kind: wasHelp ? 'help' : 'speech'
    });
    this.renderMessages(true);

    const settings = this.options.getSettings();
    this.settings = settings;
    let reply;
    try {
      if (store.isConfigured(settings)) {
        reply = await requestReply({
          session: this.session,
          scene: this.scene,
          config: this.config,
          settings,
          helpMode: wasHelp
        });
      } else {
        await delay(700 + Math.random() * 700);
        reply = this.demoReply(wasHelp);
      }
    } catch (error) {
      this.pending = false;
      this.busy = false;
      this.setStatus('idle');
      this.addMessage({
        id: `m_${Date.now()}_e`,
        role: 'system',
        kind: 'error',
        text: error.message || 'The model request failed.',
        ts: new Date().toISOString()
      });
      this.renderMessages(true);
      this.toast('Your model request failed. The room is still open.', { type: 'error', duration: 6000 });
      return;
    }

    this.pending = false;
    this.busy = false;
    this.applyReply(reply, wasHelp);
    this.updateComposer();
  }

  applyReply(reply, wasHelp) {
    if (!reply || !reply.reply) {
      this.setStatus('idle');
      this.toast('Your partner had nothing to say. Try once more.', { type: 'error' });
      return;
    }
    if (reply.coach) {
      const exists = this.coachNotes.some(
        (note) => note.original === reply.coach.original && note.better === reply.coach.better
      );
      if (!exists) this.coachNotes.push(reply.coach);
    }
    this.suggestions = reply.suggestions?.length ? reply.suggestions : this.suggestions || defaultSuggestions(this.scene);
    const message = {
      id: `m_${Date.now()}_a`,
      role: 'assistant',
      text: reply.reply,
      translation: wasHelp ? '' : reply.translation || '',
      followup: wasHelp ? reply.followup || "Let's keep going in English — what would you say?" : '',
      ts: new Date().toISOString(),
      kind: wasHelp ? 'help' : 'speech',
      suggestions: this.suggestions
    };
    this.addMessage(message);
    this.renderMessages(true);
    this.setStatus('idle');
    if (this.voiceEnabled) this.speakMessage(message);
    if (!store.isConfigured(this.options.getSettings()) && !this.demoNudged && this.session.stats.turns >= 3) {
      this.demoNudged = true;
      this.toast('These replies are scripted. Connect your AI model for a real, unscripted partner.', {
        type: 'info',
        duration: 7000,
        action: { label: 'Connect', onClick: () => this.options.onNeedApi?.() }
      });
    }
  }

  demoReply(wasHelp) {
    const messages = this.session.messages;
    const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant' && message.kind !== 'help');
    const suggestions = defaultSuggestions(this.scene);
    if (wasHelp) {
      const translation = lastAssistant?.translation || '';
      const followup = suggestions[0] || 'Could you say that again, please?';
      return {
        reply: translation
          ? `刚才这句话的意思是：“${translation}” 你不需要听懂每个词，先抓住关键词，然后用一句简单的英文接住就好。`
          : '你不需要听懂每个词。先抓住关键词，然后用一句简单的英文接住就好。',
        translation: '',
        followup,
        coach: null,
        suggestions
      };
    }
    const demo = this.scene.demo?.length
      ? this.scene.demo
      : [
          { en: 'That makes sense. Tell me a little more about that.', zh: '这说得通。多告诉我一点。' },
          { en: 'Interesting. What made you feel that way?', zh: '有意思。是什么让你有这种感觉？' },
          { en: 'I see what you mean. What would you do next?', zh: '我明白你的意思。你接下来会怎么做？' }
        ];
    const assistantCount = messages.filter((message) => message.role === 'assistant' && message.kind !== 'help').length;
    const item = demo[Math.max(0, assistantCount - 1) % demo.length];
    return {
      reply: item.en,
      translation: item.zh,
      followup: '',
      coach: demoCoach(this.lastUserText()),
      suggestions
    };
  }

  lastUserText() {
    return [...this.session.messages].reverse().find((message) => message.role === 'user' && message.kind !== 'help')?.text || '';
  }

  speakMessage(message, force = false) {
    if (!message || !message.text) return;
    if (!this.voiceEnabled && !force) return;
    this.speakSeq += 1;
    const token = this.speakSeq;
    tts.cancel();
    this.speaking = true;
    this.setStatus('speaking');
    const parts =
      message.kind === 'help'
        ? [
            { text: message.text, lang: 'zh-CN', hints: ['Xiaoxiao', 'Tingting', 'Google 普通话', 'Huihui'] },
            ...(message.followup ? [{ text: message.followup, lang: this.accent.lang, accent: this.accent.id }] : [])
          ]
        : [{ text: message.text, lang: this.accent.lang, accent: this.accent.id }];
    const settings = this.options.getSettings();
    tts
      .speakParts(parts, {
        rate: this.pace.rate,
        voiceURI: settings.voiceURI || 'auto'
      })
      .then((completed) => {
        if (this.destroyed || token !== this.speakSeq) return;
        this.speaking = false;
        if (this.listening) this.setStatus('listening');
        else if (this.thinking) this.setStatus('thinking');
        else this.setStatus('idle');
        if (!completed) return;
      });
  }

  speakEnglish(text) {
    if (!text) return;
    this.speakSeq += 1;
    tts.speak(text, {
      lang: this.accent.lang,
      rate: this.pace.rate,
      voiceURI: this.options.getSettings().voiceURI || 'auto'
    });
  }

  replayMessage(id) {
    const message = this.session.messages.find((item) => item.id === id);
    if (!message) return;
    if (message.role === 'user') {
      this.speakEnglish(message.text);
      return;
    }
    this.speakMessage(message, true);
  }

  replayLast(initial = false) {
    const last = [...this.session.messages].reverse().find((message) => message.role === 'assistant');
    if (!last) return;
    this.speakMessage(last, initial ? false : true);
  }

  enableHelp({ prefill = '' } = {}) {
    this.helpMode = true;
    this.lifelineBanner.hidden = false;
    this.root.querySelector('[data-lifeline-toggle]')?.classList.add('is-active');
    if (prefill) this.input.value = prefill;
    this.input.placeholder = '用中文说你哪里没听懂...';
    this.setStatus('help');
    this.updateComposer();
    this.input.focus();
  }

  disableHelp() {
    this.helpMode = false;
    if (this.lifelineBanner) this.lifelineBanner.hidden = true;
    this.root.querySelector('[data-lifeline-toggle]')?.classList.remove('is-active');
    if (this.input) this.input.placeholder = 'Type in English...';
    this.setStatus('idle');
    this.updateComposer();
  }

  toggleListening() {
    if (!stt.supported) {
      this.toast(SPEECH_ERRORS.unsupported, { type: 'error' });
      return;
    }
    if (this.listening) {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      stt.stop();
      return;
    }
    if (this.busy) {
      this.toast('Wait for your partner to finish, then speak.', { type: 'info' });
      return;
    }
    this.disableHelp();
    this.speakSeq += 1;
    tts.cancel();
    this.speaking = false;
    this.helpMode = false;
    this.input.value = '';
    this.updateComposer();
    this.setListening(true);
    this.setStatus('listening');
    const started = stt.start({
      lang: this.accent.lang,
      onStart: () => {
        this.setListening(true);
        this.setStatus('listening');
      },
      onInterim: (text) => {
        this.input.value = text;
        this.updateComposer();
        if (text.trim()) this.resetSilenceTimer();
      },
      onError: (code) => {
        if (code === 'no-speech' || code === 'aborted') return;
        this.toast(SPEECH_ERRORS[code] || SPEECH_ERRORS.unknown, { type: 'error', duration: 5500 });
      },
      onEnd: (text, info = {}) => {
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        if (this.listenTimer) clearTimeout(this.listenTimer);
        this.setListening(false);
        if (this.destroyed) return;
        if (text) {
          this.input.value = text;
          this.updateComposer();
          setTimeout(() => {
            if (!this.destroyed && !this.busy) this.sendText(text, 'voice');
          }, 180);
        } else if (!info.discarded && info.error && info.error !== 'no-speech' && info.error !== 'aborted') {
          this.setStatus('idle');
        } else {
          if (!info.discarded && info.error === 'no-speech') {
            this.toast(SPEECH_ERRORS['no-speech'], { type: 'info', duration: 4000 });
          }
          this.setStatus('idle');
        }
      }
    });
    if (!started) {
      this.setListening(false);
      this.setStatus('idle');
    } else {
      this.listenTimer = setTimeout(() => {
        if (this.listening) stt.stop();
      }, 30_000);
    }
  }

  resetSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      if (this.listening) stt.stop();
    }, 3800);
  }

  setListening(value) {
    this.listening = value;
    const room = this.$('.room');
    if (room) room.classList.toggle('is-listening', value);
    if (this.micBtn) {
      this.micBtn.classList.toggle('is-listening', value);
      this.micBtn.innerHTML = icon(value ? 'stop' : 'mic');
      this.micBtn.setAttribute('aria-label', value ? 'Stop listening and send' : 'Start speaking');
    }
    if (value) {
      this.setStatus('listening');
    } else if (!this.busy && !this.speaking) {
      this.setStatus('idle');
    }
  }

  async leaveRoom() {
    if (this.ending) return;
    const confirmed = await this.options.confirm({
      title: 'Leave this conversation?',
      message: 'Your draft is saved in this browser. You can resume it from the home page, or come back and end it for a full report.',
      confirmLabel: 'Leave room',
      cancelLabel: 'Keep talking'
    });
    if (!confirmed) return;
    this.ending = true;
    this.stopEverything();
    this.syncSession();
    this.destroy({ preserveDraft: true });
    this.options.onExit?.();
  }

  async endSession() {
    if (this.ending) return;
    const confirmed = await this.options.confirm({
      title: 'End this conversation?',
      message: 'You will get a transcript, a score and specific corrections. This closes the room — you can start another scene any time.',
      confirmLabel: 'End & get feedback',
      cancelLabel: 'Keep talking',
      eyebrow: 'Finish the session'
    });
    if (!confirmed) return;
    this.ending = true;
    this.stopEverything();
    this.elapsed = Math.max(this.elapsed, Number(this.session.stats?.durationSeconds) || 0);
    this.session.endedAt = new Date().toISOString();
    this.session.status = 'analysing';
    this.session.stats = { ...this.computeStats(), durationSeconds: this.elapsed };
    this.session.coachNotes = this.coachNotes;
    this.options.onSessionChange(this.session);
    this.destroy({ preserveDraft: true });
    this.options.onEnd?.(this.session);
  }

  stopEverything() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.listenTimer) clearTimeout(this.listenTimer);
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
    stt.abort();
    tts.cancel();
    this.setListening(false);
    this.speaking = false;
  }

  destroy({ preserveDraft = false } = {}) {
    if (this.destroyed) return;
    this.destroyed = true;
    document.body.classList.remove('room-mode');
    if (this.timer) clearInterval(this.timer);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.listenTimer) clearTimeout(this.listenTimer);
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
    stt.abort();
    tts.cancel();
    document.removeEventListener('click', this.documentClick);
    if (!preserveDraft && !this.ending) {
      this.syncSession();
    }
    this.root.innerHTML = '';
  }
}

export function mountRoom(root, options) {
  const room = new Room(root, options);
  return {
    destroy() {
      room.destroy();
    },
    room
  };
}
