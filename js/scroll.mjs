import { $, $$ } from './shared.mjs';

const heroVideo = $('.hero-video');

function onScroll() {
  if (heroVideo) {
    heroVideo.style.transform = `translateY(${window.scrollY * 0.3}px)`;
  }
}

export function initScroll() {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  $$('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      const target = $(href);
      if (!target) return;

      e.preventDefault();
      const offset = $('#header')?.offsetHeight ?? 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}
