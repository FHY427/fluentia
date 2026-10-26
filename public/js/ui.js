import { icon } from './icons.js';

let activeModal = null;
const focusStack = [];

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatMinutes(seconds) {
  const mins = Math.max(0, Math.round((Number(seconds) || 0) / 60));
  if (mins < 1) return '< 1 min';
  return `${mins} min`;
}

export function timeAgo(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const then = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((start - then) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function scoreTone(score) {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 55) return 'steady';
  return 'starting';
}

export function scoreLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 55) return 'Steady';
  return 'Getting started';
}

export function spinner(label = 'Loading') {
  return `<span class="spinner" role="status" aria-label="${esc(label)}"></span>`;
}

export function openModal({ content, className = '', onMount, onClose, dismissible = true, label = '' }) {
  const root = document.getElementById('modal-root');
  if (!root) return () => {};
  if (activeModal) activeModal.close(true);

  const previousFocus = document.activeElement;
  focusStack.push(previousFocus);
  const scrim = document.createElement('div');
  scrim.className = 'modal-scrim';
  scrim.setAttribute('data-modal-scrim', '');
  scrim.innerHTML = `<section class="modal-panel ${className}" role="dialog" aria-modal="true" ${
    label ? `aria-label="${esc(label)}"` : ''
  }>${content}</section>`;
  root.appendChild(scrim);
  document.body.classList.add('modal-open');

  const panel = scrim.querySelector('.modal-panel');
  let closed = false;

  const close = (silent = false) => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeyDown, true);
    scrim.classList.add('is-closing');
    const finish = () => {
      const isCurrent = activeModal?.scrim === scrim;
      scrim.remove();
      if (!document.querySelector('.modal-scrim')) document.body.classList.remove('modal-open');
      if (isCurrent) {
        activeModal = null;
        focusStack.pop();
        if (!silent && previousFocus && typeof previousFocus.focus === 'function') {
          try {
            previousFocus.focus({ preventScroll: true });
          } catch {
            /* ignore */
          }
        }
        if (!silent) onClose?.();
      }
    };
    window.setTimeout(finish, 140);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && dismissible) {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      panel.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  scrim.addEventListener('click', (event) => {
    if (event.target === scrim && dismissible) close();
  });

  panel.querySelectorAll('[data-close-modal]').forEach((element) => {
    element.addEventListener('click', () => close());
  });

  document.addEventListener('keydown', onKeyDown, true);

  requestAnimationFrame(() => {
    scrim.classList.add('is-open');
    const autofocus = panel.querySelector('[data-autofocus]');
    if (autofocus && typeof autofocus.focus === 'function') {
      autofocus.focus({ preventScroll: true });
      if (typeof autofocus.select === 'function' && autofocus.tagName === 'INPUT') autofocus.select();
    }
  });

  activeModal = { close, panel, scrim };
  onMount?.(panel, close);
  return close;
}

export function closeModal() {
  activeModal?.close();
}

export function toast(message, { type = 'info', action = null, duration = 4200 } = {}) {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const node = document.createElement('div');
  node.className = `toast toast-${type}`;
  const iconName = type === 'error' ? 'alert-circle' : type === 'success' ? 'check' : 'sparkles';
  node.innerHTML = `<span class="toast-icon">${icon(iconName)}</span><span class="toast-text"></span><button class="toast-close" aria-label="Dismiss">${icon(
    'close'
  )}</button>`;
  node.querySelector('.toast-text').textContent = message;
  if (action && action.label) {
    const button = document.createElement('button');
    button.className = 'toast-action';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      action.onClick?.();
      dismiss();
    });
    node.insertBefore(button, node.querySelector('.toast-close'));
  }
  const dismiss = () => {
    node.classList.add('is-leaving');
    window.setTimeout(() => node.remove(), 220);
  };
  node.querySelector('.toast-close').addEventListener('click', dismiss);
  host.appendChild(node);
  requestAnimationFrame(() => node.classList.add('is-visible'));
  if (duration > 0) window.setTimeout(dismiss, duration);
}

export function confirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  eyebrow = 'Just checking'
}) {
  return new Promise((resolve) => {
    let answered = false;
    let close = null;
    close = openModal({
      className: 'modal-confirm',
      dismissible: true,
      onClose: () => {
        if (!answered) resolve(false);
      },
      content: `
        <div class="confirm-body">
          <div class="confirm-icon ${danger ? 'is-danger' : ''}">${icon(danger ? 'alert-circle' : 'message')}</div>
          <p class="eyebrow">${esc(eyebrow)}</p>
          <h2>${esc(title)}</h2>
          <p class="confirm-message">${esc(message)}</p>
        </div>
        <div class="confirm-actions">
          <button class="btn btn-ghost" data-cancel>${esc(cancelLabel)}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${esc(confirmLabel)}</button>
        </div>`
    });
    const panel = document.querySelector('.modal-confirm');
    panel?.querySelector('[data-confirm]')?.addEventListener('click', () => {
      answered = true;
      close();
      resolve(true);
    });
    panel?.querySelector('[data-cancel]')?.addEventListener('click', () => {
      answered = true;
      close();
      resolve(false);
    });
  });
}

export function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => false);
  }
  return Promise.resolve(false);
}
