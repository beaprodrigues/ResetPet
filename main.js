'use strict';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const HeaderModule = (() => {
  const header = $('#header');
  const hamburger = $('#hamburger');
  const nav = $('#nav');
  const searchBtn = $('#search-toggle');
  const searchBar = $('#search-bar');
  const searchClose = $('#search-close');
  const searchInput = $('#search-input');

  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 60);
  }

  function toggleMenu() {
    hamburger.classList.toggle('open');
    nav.classList.toggle('open');
    document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
  }

  function bindNavLinks() {
    $$('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        nav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  function openSearch() {
    searchBar.classList.add('open');
    header.classList.add('scrolled');
    setTimeout(() => searchInput?.focus(), 300);
  }

  function closeSearch() {
    searchBar.classList.remove('open');
    if (window.scrollY <= 60) header.classList.remove('scrolled');
  }

  function init() {
    window.addEventListener('scroll', onScroll, { passive: true });
    hamburger?.addEventListener('click', toggleMenu);
    searchBtn?.addEventListener('click', openSearch);
    searchClose?.addEventListener('click', closeSearch);
    bindNavLinks();
    onScroll();
  }

  return { init };
})();

const CartModule = (() => {
  const drawer = $('#cart-drawer');
  const overlay = $('#cart-overlay');
  const closeBtn = $('#cart-close');
  const itemsEl = $('#cart-items');
  const footerEl = $('#cart-footer');
  const totalEl = $('#cart-total');
  const countEl = $('#cart-count');

  let items = [];

  function open() {
    drawer?.classList.add('open');
    overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    drawer?.classList.remove('open');
    overlay?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function addItem(name, price) {
    const existing = items.find((item) => item.name === name);

    if (existing) {
      existing.qty += 1;
    } else {
      items.push({ name, price: parseFloat(price), qty: 1 });
    }

    render();
    updateBadge();
    ToastModule.show(`${name} adicionado ao carrinho ✓`);
  }

  function changeQty(name, delta) {
    const item = items.find((entry) => entry.name === name);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      items = items.filter((entry) => entry.name !== name);
    }

    render();
    updateBadge();
  }

  function render() {
    if (!itemsEl) return;

    if (items.length === 0) {
      itemsEl.innerHTML = '<p class="cart-empty">Seu carrinho está vazio.</p>';
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    if (footerEl) footerEl.style.display = 'flex';

    itemsEl.innerHTML = items.map((item) => `
      <div class="cart-item">
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-price">${formatBRL(item.price)}</p>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" data-name="${item.name}" data-delta="-1">−</button>
          <span>${item.qty}</span>
          <button class="qty-btn" data-name="${item.name}" data-delta="1">+</button>
        </div>
      </div>
    `).join('');

    $$('.qty-btn', itemsEl).forEach((btn) => {
      btn.addEventListener('click', () => {
        changeQty(btn.dataset.name, Number.parseInt(btn.dataset.delta, 10));
      });
    });

    const total = items.reduce((acc, item) => acc + item.price * item.qty, 0);
    if (totalEl) totalEl.textContent = formatBRL(total);
  }

  function updateBadge() {
    if (!countEl) return;

    const count = items.reduce((acc, item) => acc + item.qty, 0);
    countEl.textContent = count;
    countEl.classList.toggle('visible', count > 0);
    countEl.style.animation = 'none';
    requestAnimationFrame(() => {
      countEl.style.animation = 'badgePop .3s var(--ease-bounce)';
    });
  }

  function bindAddButtons() {
    $$('.btn-add').forEach((btn) => {
      btn.addEventListener('click', () => {
        addItem(btn.dataset.name, btn.dataset.price);
      });
    });
  }

  function bindWishButtons() {
    $$('.btn-wish').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
      });
    });
  }

  function init() {
    $('.cart-btn')?.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
    bindAddButtons();
    bindWishButtons();
  }

  return { init, addItem, open };
})();



const RevealModule = (() => {
  const targets = $$('[data-reveal]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const delay = (entry.target.closest('.products-grid, .categories-grid, .about-stats')
          ? Array.from(entry.target.parentElement.children).indexOf(entry.target)
          : 0) * 80;

        setTimeout(() => {
          entry.target.classList.add('revealed');
        }, delay);

        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  function init() {
    targets.forEach((el) => observer.observe(el));
  }

  return { init };
})();

const CounterModule = (() => {
  const nums = $$('[data-target]');
  let started = false;

  function animateCount(el) {
    const target = Number.parseInt(el.dataset.target, 10);
    const duration = 5000;
    const start = performance.now();

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target).toLocaleString('pt-BR');
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !started) {
        started = true;
        nums.forEach((num) => animateCount(num));
        observer.disconnect();
      }
    });
  }, { threshold: 0.4 });

  function init() {
    const section = $('#sobre');
    if (section) observer.observe(section);
  }

  return { init };
})();

const VideoModule = (() => {
  const playBtn  = $('#play-btn');
  const videoEl  = $('#lifestyle-thumb');
  const videoWrap = $('#video-wrap');

  function hidePlayButton() {
    playBtn?.classList.remove('is-visible');
  }

  function showPlayButton() {
    playBtn?.classList.add('is-visible');
  }

  function playVideo() {
    if (!videoEl) return;

    hidePlayButton();
    videoEl.muted = false;
    videoEl.controls = false;
    videoEl.play().catch(() => {
      videoEl.muted = true;
      videoEl.play();
    });
  }

  function init() {
    if (!videoEl) return;

    videoEl.addEventListener('playing', hidePlayButton);

    videoEl.play()
      .then(() => hidePlayButton())
      .catch(() => {
        console.log('Autoplay bloqueado, aguardando interação');
        showPlayButton();
      });

    playBtn?.addEventListener('click', playVideo);
    videoWrap?.addEventListener('click', (e) => {
      if (!playBtn || !playBtn.contains(e.target)) return;
      playVideo();
    });
  }

  return { init };
})();

const NewsletterModule = (() => {
  const form = $('#newsletter-form');
  const ok = $('#newsletter-ok');

  function init() {
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (!input?.value) return;

      input.value = '';
      ok?.classList.add('visible');
      setTimeout(() => ok?.classList.remove('visible'), 4000);
    });
  }

  return { init };
})();

const ToastModule = (() => {
  const toast = $('#toast');
  let timer = null;

  function show(msg, duration = 3000) {
    if (!toast) return;

    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  return { show };
})();

const ParallaxModule = (() => {
  const video = $('.hero-video');

  function onScroll() {
    if (!video) return;

    const scrollY = window.scrollY;
    video.style.transform = `translateY(${scrollY * 0.3}px)`;
  }

  function init() {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  return { init };
})();

const AnchorModule = (() => {
  function init() {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const targetId = link.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (!target) return;

        event.preventDefault();
        const headerHeight = $('#header')?.offsetHeight ?? 80;
        const top = target.getBoundingClientRect().top + window.scrollY - headerHeight;

        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  return { init };
})();

const QuizModule = (() => {
  // ══════════════════════════════════════
  // 👇 PLACEHOLDER: troque pelo número real
  // Formato: 55 + DDD + número (sem espaços ou traços)
  // Exemplo: '5512999998888'
  const WHATSAPP_NUMBER = '5500000000000';
  // ══════════════════════════════════════

  const TOTAL_STEPS = 5;
  let currentStep = 1;
  const answers = {};

  const progressBar = $('#quiz-progress-bar');
  const whatsappBtn = $('#quiz-whatsapp-btn');
  const restartBtn  = $('#quiz-restart');
  const resultTitle = $('#quiz-result-title');
  const resultText  = $('#quiz-result-text');

  const RECOMENDACOES = {
    ansiedade: {
      titulo: 'Linha Equilíbrio — ideal para reduzir ansiedade',
      texto:  'Com base nas respostas, seu pet pode se beneficiar muito dos nossos moduladores biofísicos voltados para ansiedade e estresse. Nossa linha Equilíbrio atua no sistema nervoso de forma natural e sem efeitos colaterais.'
    },
    alergia: {
      titulo: 'Linha Pele Saudável — contra alergias e coceiras',
      texto:  'Identificamos que seu pet pode ter sensibilidade na pele. Nossa linha Pele Saudável combina ingredientes naturais anti-inflamatórios que ajudam a reduzir coceiras, vermelhidão e descamação com uso contínuo.'
    },
    longevidade: {
      titulo: 'Linha Vitalidade — energia e longevidade',
      texto:  'Seu pet merece viver muito e com saúde! A linha Vitalidade da ResetPet foi desenvolvida para estimular a disposição, preservar as articulações e prolongar a qualidade de vida de pets adultos e sênior.'
    },
    imunidade: {
      titulo: 'Linha Imunidade — defesas em dia',
      texto:  'Pets com imunidade baixa ficam mais suscetíveis a doenças. Nossa linha Imunidade combina extratos naturais que fortalecem as defesas do organismo e promovem bem-estar de dentro para fora.'
    },
  };

  function updateProgress() {
    const pct = (currentStep / TOTAL_STEPS) * 100;
    if (progressBar) progressBar.style.width = `${pct}%`;
  }

  function showStep(step) {
    $$('.quiz-step').forEach((el) => el.classList.remove('active'));
    const target = $(`.quiz-step[data-step="${step}"]`);
    if (target) target.classList.add('active');
  }

  function buildWhatsAppMessage() {
    const mapaLabels = {
      especie:     { cachorro: '🐶 Cachorro', gato: '🐱 Gato', outro: '🐾 Outro' },
      idade:       { filhote: 'Filhote (0–1 ano)', adulto: 'Adulto (1–7 anos)', senior: 'Sênior (7+ anos)' },
      desafio:     { ansiedade: 'Ansiedade e estresse', alergia: 'Alergias na pele', longevidade: 'Longevidade e energia', imunidade: 'Imunidade baixa' },
      experiencia: { sim: 'Sim, com bons resultados', tentou: 'Tentei, sem resultado', nao: 'Ainda não usei' },
      compra:      { online: 'Pelo site', whatsapp: 'Prefiro falar antes', loja: 'Em uma loja parceira' },
    };

    const rec = RECOMENDACOES[answers.desafio] || RECOMENDACOES.longevidade;

    const lines = [
      'Olá! Fiz o questionário do site da ResetPet e gostaria de saber mais. 🐾',
      '',
      `*Meu pet:* ${mapaLabels.especie[answers.especie] || answers.especie}`,
      `*Idade:* ${mapaLabels.idade[answers.idade] || answers.idade}`,
      `*Principal desafio:* ${mapaLabels.desafio[answers.desafio] || answers.desafio}`,
      `*Experiência anterior:* ${mapaLabels.experiencia[answers.experiencia] || answers.experiencia}`,
      `*Preferência de compra:* ${mapaLabels.compra[answers.compra] || answers.compra}`,
      '',
      `*Recomendação recebida:* ${rec.titulo}`,
      '',
      'Podem me ajudar?',
    ];

    return encodeURIComponent(lines.join('\n'));
  }

  function showResult() {
    const rec = RECOMENDACOES[answers.desafio] || RECOMENDACOES.longevidade;

    if (resultTitle) resultTitle.textContent = rec.titulo;
    if (resultText)  resultText.textContent  = rec.texto;

    const msg = buildWhatsAppMessage();
    if (whatsappBtn) {
      whatsappBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
    }

    if (progressBar) progressBar.style.width = '100%';
    showStep('resultado');
  }

  function handleOptionClick(btn) {
    const key = btn.dataset.key;
    const val = btn.dataset.val;
    answers[key] = val;

    // feedback visual breve
    const siblings = $$('.quiz-opt', btn.closest('.quiz-step'));
    siblings.forEach((s) => s.classList.remove('selected'));
    btn.classList.add('selected');

    setTimeout(() => {
      if (currentStep < TOTAL_STEPS) {
        currentStep += 1;
        updateProgress();
        showStep(currentStep);
      } else {
        showResult();
      }
    }, 280);
  }

  function restart() {
    currentStep = 1;
    Object.keys(answers).forEach((k) => delete answers[k]);
    $$('.quiz-opt').forEach((b) => b.classList.remove('selected'));
    updateProgress();
    showStep(1);
  }

  function init() {
    $$('.quiz-opt').forEach((btn) => {
      btn.addEventListener('click', () => handleOptionClick(btn));
    });

    restartBtn?.addEventListener('click', restart);
    updateProgress();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  HeaderModule.init();
  CartModule.init();
  RevealModule.init();
  CounterModule.init();
  VideoModule.init();
  NewsletterModule.init();
  ParallaxModule.init();
  AnchorModule.init();
  QuizModule.init();
});
