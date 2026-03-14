// ── Chart.js Global Defaults ─────────────────────────────────────────────────
Chart.defaults.color = '#7b8299';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Space Mono', monospace";
Chart.defaults.font.size = 11;

const COLORS = {
  accent: '#f97316',
  green:  '#22c55e',
  blue:   '#3b82f6',
  purple: '#a855f7',
  yellow: '#eab308',
  red:    '#ef4444',
  teal:   '#14b8a6',
  pink:   '#ec4899',
};

const STATUS_COLORS = {
  APPROVED:  COLORS.green,
  COMPLETE:  COLORS.green,
  COMPLETED: COLORS.green,
  REFUNDED:  COLORS.red,
  CANCELLED: COLORS.red,
  CANCELED:  COLORS.red,
  CHARGEBACK: '#f59e0b',
  BLOCKED:   '#6b7280',
  WAITING_PAYMENT: COLORS.yellow,
  PRINTED_BILLET: COLORS.yellow,
  STARTED:   COLORS.blue,
  UNKNOWN:   '#4b5563',
};

const PAYMENT_LABELS = {
  CREDIT_CARD: 'Cartão de Crédito',
  BILLET:      'Boleto',
  PIX:         'Pix',
  PAYPAL:      'PayPal',
  DEBIT_CARD:  'Cartão de Débito',
  OTHERS:      'Outros',
};

const STATUS_LABELS = {
  APPROVED:        'Aprovado',
  COMPLETE:        'Completo',
  COMPLETED:       'Completo',
  REFUNDED:        'Reembolsado',
  CANCELLED:       'Cancelado',
  CANCELED:        'Cancelado',
  CHARGEBACK:      'Chargeback',
  BLOCKED:         'Bloqueado',
  WAITING_PAYMENT: 'Aguardando',
  PRINTED_BILLET:  'Boleto Impresso',
  STARTED:         'Iniciado',
};

// ── Chart instances ───────────────────────────────────────────────────────────
let charts = {};

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}
function fmtNum(value) {
  return new Intl.NumberFormat('pt-BR').format(value || 0);
}
function fmtMonth(ym) {
  const [y, m] = ym.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[parseInt(m)-1]}/${y.slice(2)}`;
}
function fmtDay(d) {
  const date = new Date(d + 'T00:00:00');
  return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}`;
}

// ── Render KPIs ───────────────────────────────────────────────────────────────
function renderKPIs(data) {
  const brl = data.totalRevenue?.BRL || 0;
  const usd = data.totalRevenue?.USD || 0;

  document.getElementById('kpi-revenue').textContent = fmtBRL(brl);
  if (usd > 0) {
    document.getElementById('kpi-revenue-usd').textContent = `+ USD ${fmtNum(usd.toFixed(2))}`;
  }

  document.getElementById('kpi-total').textContent = fmtNum(data.totalSales);
  document.getElementById('kpi-approved').textContent = fmtNum(data.approvedSales);
  document.getElementById('kpi-refunded').textContent = fmtNum(data.refundedSales);

  const approvedPct = data.totalSales ? (data.approvedSales / data.totalSales * 100) : 0;
  const refundedPct = data.totalSales ? (data.refundedSales / data.totalSales * 100) : 0;

  setTimeout(() => {
    document.getElementById('kpi-approved-bar').style.width = `${approvedPct}%`;
    document.getElementById('kpi-refunded-bar').style.width = `${refundedPct}%`;
  }, 200);
}

// ── Render Charts ─────────────────────────────────────────────────────────────
function renderMonthlySales(data) {
  destroyChart('monthly');
  const ctx = document.getElementById('chart-monthly-sales').getContext('2d');
  charts['monthly'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.salesByMonth.labels.map(fmtMonth),
      datasets: [{
        label: 'Vendas',
        data: data.salesByMonth.data,
        backgroundColor: 'rgba(249,115,22,0.75)',
        borderColor: COLORS.accent,
        borderWidth: 0,
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmtNum(ctx.parsed.y)} vendas` } } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => fmtNum(v) } }
      }
    }
  });
}

function renderRevenueChart(data) {
  destroyChart('revenue');
  const ctx = document.getElementById('chart-revenue').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, 'rgba(34,197,94,0.3)');
  gradient.addColorStop(1, 'rgba(34,197,94,0)');

  charts['revenue'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.revenueByMonth.labels.map(fmtMonth),
      datasets: [{
        label: 'Receita BRL',
        data: data.revenueByMonth.data,
        borderColor: COLORS.green,
        backgroundColor: gradient,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: COLORS.green,
        pointRadius: 3,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmtBRL(ctx.parsed.y)}` } } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => `R$${(v/1000).toFixed(0)}k` } }
      }
    }
  });
}

function renderStatusChart(data) {
  destroyChart('status');
  const ctx = document.getElementById('chart-status').getContext('2d');
  const labels = data.salesByStatus.map(s => STATUS_LABELS[s.status] || s.status);
  const counts = data.salesByStatus.map(s => s.count);
  const colors = data.salesByStatus.map(s => STATUS_COLORS[s.status] || '#6b7280');

  charts['status'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: counts, backgroundColor: colors, borderColor: '#131720', borderWidth: 3, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { position: 'right', labels: { padding: 14, boxWidth: 10, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ` ${fmtNum(ctx.parsed)} (${((ctx.parsed / counts.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)` } }
      }
    }
  });
}

function renderPaymentChart(data) {
  destroyChart('payment');
  const ctx = document.getElementById('chart-payment').getContext('2d');
  const palette = [COLORS.blue, COLORS.purple, COLORS.teal, COLORS.yellow, COLORS.pink, COLORS.accent];
  const labels = data.salesByPaymentType.map(p => PAYMENT_LABELS[p.type] || p.type);
  const counts = data.salesByPaymentType.map(p => p.count);

  charts['payment'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: counts, backgroundColor: palette, borderColor: '#131720', borderWidth: 3, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { position: 'right', labels: { padding: 14, boxWidth: 10, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ` ${fmtNum(ctx.parsed)}` } }
      }
    }
  });
}

function renderDailyChart(data) {
  destroyChart('daily');
  const ctx = document.getElementById('chart-daily').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, 'rgba(59,130,246,0.25)');
  gradient.addColorStop(1, 'rgba(59,130,246,0)');

  charts['daily'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.dailySales.labels.map(fmtDay),
      datasets: [{
        label: 'Vendas',
        data: data.dailySales.data,
        backgroundColor: 'rgba(59,130,246,0.65)',
        borderColor: COLORS.blue,
        borderWidth: 0,
        borderRadius: 3,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmtNum(ctx.parsed.y)} vendas` } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => fmtNum(v) }, beginAtZero: true }
      }
    }
  });
}

// ── Render Table ──────────────────────────────────────────────────────────────
function renderProductsTable(data) {
  const tbody = document.getElementById('products-table-body');
  const products = data.salesByProduct;
  const maxCount = products[0]?.count || 1;

  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Nenhum produto encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = products.map((p, i) => {
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
    const pct = ((p.count / maxCount) * 100).toFixed(0);
    return `
      <tr>
        <td><span class="table-rank ${rankClass}">${i === 0 ? '▲' : i === 1 ? '▲' : i === 2 ? '▲' : ''}#${i+1}</span></td>
        <td><span class="table-product">${escHtml(p.name)}</span></td>
        <td><span class="table-count">${fmtNum(p.count)}</span></td>
        <td><span class="table-revenue">${fmtBRL(p.revenue)}</span></td>
        <td>
          <div class="table-share-wrap">
            <div class="table-share-bar-bg">
              <div class="table-share-bar" style="width: ${pct}%"></div>
            </div>
            <span class="table-share-pct">${pct}%</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function showLoading(msg = '') {
  document.getElementById('loading-screen').classList.remove('hidden');
  document.getElementById('error-screen').classList.add('hidden');
  document.getElementById('main-content').classList.add('hidden');
  if (msg) document.getElementById('loading-msg').textContent = msg;
}

function showError(msg) {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('error-screen').classList.remove('hidden');
  document.getElementById('main-content').classList.add('hidden');
  document.getElementById('error-msg').textContent = msg;
  setStatus('error', 'Erro');
}

function showDashboard() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('error-screen').classList.add('hidden');
  document.getElementById('main-content').classList.remove('hidden');
}

function setStatus(type, text) {
  const badge = document.getElementById('status-badge');
  badge.className = `status-badge ${type}`;
  badge.querySelector('.status-text').textContent = text;
}

function setMeta(data, count) {
  const d = new Date(data.lastUpdated);
  document.getElementById('last-updated').textContent =
    `Atualizado às ${d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}`;
  document.getElementById('total-records').textContent = `${fmtNum(count)} registros`;
}

// ── Main Data Loader ──────────────────────────────────────────────────────────
async function loadData(forceRefresh = false) {
  showLoading('Buscando histórico completo de vendas...');

  const msgs = [
    'Conectando à API Hotmart...',
    'Buscando página 1...',
    'Processando transações...',
    'Quase lá...'
  ];
  let mi = 0;
  const interval = setInterval(() => {
    mi = (mi + 1) % msgs.length;
    const el = document.getElementById('loading-msg');
    if (el) el.textContent = msgs[mi];
  }, 3000);

  try {
    const endpoint = forceRefresh ? '/api/refresh' : '/api/dashboard';
    const method = forceRefresh ? 'POST' : 'GET';

    const res = await fetch(endpoint, { method });
    clearInterval(interval);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Erro desconhecido');

    const data = json.data;

    renderKPIs(data);
    renderMonthlySales(data);
    renderRevenueChart(data);
    renderStatusChart(data);
    renderPaymentChart(data);
    renderDailyChart(data);
    renderProductsTable(data);
    setMeta(data, json.rawCount);
    setStatus('ok', 'Online');
    showDashboard();

  } catch (err) {
    clearInterval(interval);
    console.error('[Dashboard]', err);
    showError(err.message);
  }
}

async function refreshData() {
  const btn = document.getElementById('btn-refresh');
  btn.disabled = true;
  btn.classList.add('spinning');
  setStatus('', 'Atualizando...');

  await loadData(true);

  btn.disabled = false;
  btn.classList.remove('spinning');
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadData();
