import { $ } from './shared.mjs';

const form = $('#newsletter-form');
const feedback = $('#newsletter-ok');

export function initNewsletter() {
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('input[type="email"]', form);
    if (!input?.value) return;

    input.value = '';
    feedback?.classList.add('visible');
    setTimeout(() => feedback?.classList.remove('visible'), 4000);
  });
}
