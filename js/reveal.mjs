import { $$ } from './shared.mjs';

export function initReveal() {
  const targets = $$('[data-reveal]');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const group = entry.target.closest('.partners-grid');
      const index = group ? Array.from(group.children).indexOf(entry.target) : 0;

      setTimeout(() => entry.target.classList.add('revealed'), index * 80);
      obs.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  targets.forEach((el) => observer.observe(el));
}
