import { $, $$ } from './shared.mjs';

const WHATSAPP_NUMBER = '5500000000000';
const TOTAL_STEPS = 5;

const progressBar = $('#quiz-progress-bar');
const whatsappBtn = $('#quiz-whatsapp-btn');
const restartBtn = $('#quiz-restart');
const resultTitle = $('#quiz-result-title');
const resultText = $('#quiz-result-text');

const RECOMMENDATIONS = {
  ansiedade: {
    titulo: 'Linha Equilíbrio — ideal para reduzir ansiedade',
    texto: 'Com base nas respostas, seu pet pode se beneficiar muito dos nossos moduladores biofísicos voltados para ansiedade e estresse. Nossa linha Equilíbrio atua no sistema nervoso de forma natural e sem efeitos colaterais.'
  },
  alergia: {
    titulo: 'Linha Pele Saudável — contra alergias e coceiras',
    texto: 'Identificamos que seu pet pode ter sensibilidade na pele. Nossa linha Pele Saudável combina ingredientes naturais anti-inflamatórios que ajudam a reduzir coceiras, vermelhidão e descamação com uso contínuo.'
  },
  longevidade: {
    titulo: 'Linha Vitalidade — energia e longevidade',
    texto: 'Seu pet merece viver muito e com saúde! A linha Vitalidade da ResetPet foi desenvolvida para estimular a disposição, preservar as articulações e prolongar a qualidade de vida de pets adultos e sênior.'
  },
  imunidade: {
    titulo: 'Linha Imunidade — defesas em dia',
    texto: 'Pets com imunidade baixa ficam mais suscetíveis a doenças. Nossa linha Imunidade combina extratos naturais que fortalecem as defesas do organismo e promovem bem-estar de dentro para fora.'
  }
};

const LABELS = {
  especie: { cachorro: '🐶 Cachorro', gato: '🐱 Gato', outro: '🐾 Outro' },
  idade: { filhote: 'Filhote (0–1 ano)', adulto: 'Adulto (1–7 anos)', senior: 'Sênior (7+ anos)' },
  desafio: {
    ansiedade: 'Ansiedade e estresse',
    alergia: 'Alergias na pele',
    longevidade: 'Longevidade e energia',
    imunidade: 'Imunidade baixa'
  },
  experiencia: { sim: 'Sim, com bons resultados', tentou: 'Tentei, sem resultado', nao: 'Ainda não usei' },
  compra: { online: 'Pelo site', whatsapp: 'Prefiro falar antes', loja: 'Em uma loja parceira' }
};

let step = 1;
const answers = {};

function updateProgress() {
  if (progressBar) progressBar.style.width = `${(step / TOTAL_STEPS) * 100}%`;
}

function showStep(targetStep) {
  $$('.quiz-step').forEach((el) => el.classList.remove('active'));
  $(`.quiz-step[data-step="${targetStep}"]`)?.classList.add('active');
}

function buildMessage(rec) {
  const label = (key) => LABELS[key]?.[answers[key]] || answers[key] || '';
  const lines = [
    'Olá! Fiz o questionário do site da ResetPet e gostaria de saber mais. 🐾',
    '',
    `*Meu pet:* ${label('especie')}`,
    `*Idade:* ${label('idade')}`,
    `*Principal desafio:* ${label('desafio')}`,
    `*Experiência anterior:* ${label('experiencia')}`,
    `*Preferência de compra:* ${label('compra')}`,
    '',
    `*Recomendação recebida:* ${rec.titulo}`,
    '',
    'Podem me ajudar?'
  ];
  return encodeURIComponent(lines.join('\n'));
}

function showResult() {
  const rec = RECOMMENDATIONS[answers.desafio] || RECOMMENDATIONS.longevidade;
  if (resultTitle) resultTitle.textContent = rec.titulo;
  if (resultText) resultText.textContent = rec.texto;
  if (whatsappBtn) whatsappBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${buildMessage(rec)}`;
  if (progressBar) progressBar.style.width = '100%';
  showStep('resultado');
}

function selectOption(btn) {
  answers[btn.dataset.key] = btn.dataset.val;

  const stepEl = btn.closest('.quiz-step');
  $$('.quiz-opt', stepEl).forEach((el) => el.classList.remove('selected'));
  btn.classList.add('selected');

  setTimeout(() => {
    if (step < TOTAL_STEPS) {
      step += 1;
      updateProgress();
      showStep(step);
    } else {
      showResult();
    }
  }, 260);
}

function restart() {
  step = 1;
  Object.keys(answers).forEach((k) => delete answers[k]);
  $$('.quiz-opt').forEach((el) => el.classList.remove('selected'));
  updateProgress();
  showStep(step);
}

export function initQuiz() {
  $$('.quiz-opt').forEach((btn) => {
    btn.addEventListener('click', () => selectOption(btn));
  });
  restartBtn?.addEventListener('click', restart);
  updateProgress();
}
