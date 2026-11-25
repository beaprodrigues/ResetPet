import { $, formatBRL } from './shared.mjs';

const dialog = $('#account-dialog');
const openBtn = $('#account-toggle');
const closeBtn = $('#account-close');
const guestPanel = $('#account-guest');
const memberPanel = $('#account-member');
const loginTab = $('#account-login-tab');
const registerTab = $('#account-register-tab');
const loginForm = $('#account-login-form');
const registerForm = $('#account-register-form');
const statusEl = $('#account-status');
const ordersList = $('#account-orders-list');

const RESUME_KEY = 'resetpet-checkout-after-login';
const ORDER_STATUS = {
  paid: 'Pagamento confirmado',
  pending: 'Aguardando pagamento',
  expired: 'Pagamento não concluído'
};

let currentUser = null;

function setTab(mode) {
  const isLogin = mode === 'login';
  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  loginTab.classList.toggle('active', isLogin);
  registerTab.classList.toggle('active', !isLogin);
  loginTab.setAttribute('aria-selected', String(isLogin));
  registerTab.setAttribute('aria-selected', String(!isLogin));
  statusEl.textContent = '';
}

function openDialog() {
  if (!dialog.open) dialog.showModal();
  if (currentUser) loadOrders();
}

async function apiRequest(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Não foi possível concluir a solicitação.');
  return data;
}

function renderOrders(orders) {
  ordersList.replaceChildren();

  if (orders.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'account-empty';
    empty.textContent = 'Seus pedidos aparecerão aqui após uma compra.';
    ordersList.append(empty);
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement('article');
    card.className = 'account-order';

    const header = document.createElement('div');
    header.className = 'account-order-header';

    const title = document.createElement('h4');
    title.textContent = `Pedido ${order.id.slice(0, 8).toUpperCase()}`;

    const total = document.createElement('strong');
    total.textContent = formatBRL(order.amount_total / 100);
    header.append(title, total);

    const date = document.createElement('p');
    date.className = 'account-order-date';
    date.textContent = new Date(order.created_at).toLocaleString('pt-BR');

    const items = document.createElement('ul');
    items.className = 'account-order-items';
    order.items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = `${item.product_name} × ${item.quantity}`;
      items.append(li);
    });

    const status = document.createElement('p');
    status.className = `account-order-status account-order-status--${order.status}`;
    status.textContent = ORDER_STATUS[order.status] || 'Status atualizado';

    card.append(header, date, items, status);
    ordersList.append(card);
  });
}

async function loadOrders() {
  ordersList.replaceChildren();
  const loading = document.createElement('p');
  loading.className = 'account-empty';
  loading.textContent = 'Carregando pedidos...';
  ordersList.append(loading);

  try {
    const data = await apiRequest('/api/account/orders');
    renderOrders(data.orders);
  } catch (err) {
    ordersList.replaceChildren();
    const errorEl = document.createElement('p');
    errorEl.className = 'account-status';
    errorEl.textContent = err.message;
    ordersList.append(errorEl);
  }
}

async function setAuthenticated(user) {
  currentUser = user;
  guestPanel.hidden = true;
  memberPanel.hidden = false;
  $('#account-name').textContent = user.name;
  $('#account-email').textContent = user.email;
  openBtn.title = `Minha conta (${user.name})`;
  openBtn.setAttribute('aria-label', `Minha conta: ${user.name}`);
  await loadOrders();

  if (sessionStorage.getItem(RESUME_KEY) === '1') {
    sessionStorage.removeItem(RESUME_KEY);
    dialog.close();
    document.dispatchEvent(new Event('checkout:resume'));
  }
}

async function submitAuthForm(form, endpoint) {
  const submitBtn = $('button[type="submit"]', form);
  const originalLabel = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Aguarde...';
  statusEl.textContent = '';

  try {
    const payload = Object.fromEntries(new FormData(form));
    const data = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    form.reset();
    await setAuthenticated(data.user);
  } catch (err) {
    statusEl.textContent = err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
}

async function restoreSession() {
  try {
    const data = await apiRequest('/api/auth/me');
    if (data.user) await setAuthenticated(data.user);
  } catch {
    // Sessão ausente ou servidor offline
  }
}

async function logout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST', body: '{}' });
    currentUser = null;
    guestPanel.hidden = false;
    memberPanel.hidden = true;
    openBtn.title = 'Minha conta';
    openBtn.setAttribute('aria-label', 'Minha conta');
    setTab('login');
  } catch (err) {
    statusEl.textContent = err.message;
  }
}

export function initAccount() {
  openBtn?.addEventListener('click', openDialog);
  closeBtn?.addEventListener('click', () => dialog.close());
  document.addEventListener('account:open', openDialog);

  dialog?.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  loginTab?.addEventListener('click', () => setTab('login'));
  registerTab?.addEventListener('click', () => setTab('register'));

  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitAuthForm(loginForm, '/api/auth/login');
  });

  registerForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitAuthForm(registerForm, '/api/auth/register');
  });

  $('#account-logout')?.addEventListener('click', logout);
  restoreSession();
}
