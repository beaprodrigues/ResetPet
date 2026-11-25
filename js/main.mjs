import { initAccount } from './account.mjs';
import { initCart } from './cart.mjs';
import { initHeader } from './header.mjs';
import { initNewsletter } from './newsletter.mjs';
import { initQuiz } from './quiz.mjs';
import { initReveal } from './reveal.mjs';
import { initScroll } from './scroll.mjs';
import { initVideo } from './video.mjs';

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initAccount();
  initCart();
  initReveal();
  initVideo();
  initNewsletter();
  initScroll();
  initQuiz();
});
