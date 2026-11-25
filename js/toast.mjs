import { $ } from './shared.mjs';

const toast = $('#toast');
let timerId;

export function showToast(message, duration = 3000) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(timerId);
  timerId = setTimeout(() => toast.classList.remove('show'), duration);
}
