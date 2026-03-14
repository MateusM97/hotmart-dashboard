const axios = require('axios');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');

const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL) || 300 });

// ── Modo Mock ────────────────────────────────────────────────────────────────
const MOCK_FILE = path.join(__dirname, '..', 'mock-sales.json');
const USE_MOCK = process.env.USE_MOCK === 'true' || fs.existsSync(MOCK_FILE) && !process.env.HOTMART_TOKEN;

function loadMockData() {
  try {
    const raw = fs.readFileSync(MOCK_FILE, 'utf-8');
    const json = JSON.parse(raw);
    // Aceita tanto { items: [...] } quanto um array direto
    const items = Array.isArray(json) ? json : (json.items || []);
    console.log(`[Mock] Carregando ${items.length} vendas do arquivo mock-sales.json`);
    return items;
  } catch (err) {
    console.error('[Mock] Erro ao ler mock-sales.json:', err.message);
    return [];
  }
}

const BASE_URL = process.env.HOTMART_ENV === 'sandbox'
  ? 'https://sandbox.hotmart.com'
  : 'https://developers.hotmart.com';

const AUTH_URL = process.env.HOTMART_ENV === 'sandbox'
  ? 'https://sandbox.hotmart.com/security/oauth/token'
  : 'https://api-sec-vlc.hotmart.com/security/oauth/token';

let accessToken = process.env.HOTMART_TOKEN || null;

// ── Autenticação OAuth2 ──────────────────────────────────────────────────────
async function refreshToken() {
  try {
    const response = await axios.post(AUTH_URL, null, {
      params: { grant_type: 'client_credentials' },
      headers: {
        'Authorization': `Basic ${process.env.HOTMART_BASIC_AUTH}`,
        'Content-Type': 'application/json'
      }
    });
    accessToken = response.data.access_token;
    console.log('[Hotmart] Token renovado com sucesso');
    return accessToken;
  } catch (err) {
    console.error('[Hotmart] Erro ao renovar token:', err.message);
    throw err;
  }
}

function getHeaders() {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };
}

// ── Busca paginada genérica ──────────────────────────────────────────────────
async function fetchAllPages(endpoint, params = {}) {
  let allItems = [];
  let page_token = null;
  let page = 0;

  do {
    const queryParams = { ...params, max_results: 500 };
    if (page_token) queryParams.page_token = page_token;

    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        headers: getHeaders(),
        params: queryParams
      });

      const data = response.data;
      const items = data?.items || data?.content || [];
      allItems = allItems.concat(items);
      page_token = data?.page_info?.next_page_token || null;
      page++;
      console.log(`[Hotmart] Página ${page}: ${items.length} registros | Total: ${allItems.length}`);

    } catch (err) {
      if (err.response?.status === 401) {
        console.log('[Hotmart] Token expirado, renovando...');
        await refreshToken();
        // retry
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: getHeaders(),
          params: { ...params, max_results: 500, ...(page_token ? { page_token } : {}) }
        });
        const data = response.data;
        const items = data?.items || data?.content || [];
        allItems = allItems.concat(items);
        page_token = data?.page_info?.next_page_token || null;
      } else {
        throw err;
      }
    }
  } while (page_token);

  return allItems;
}

// ── Buscar todas as vendas (histórico completo) ─────────────────────────────
async function fetchAllSales(forceRefresh = false) {
  const cacheKey = 'all_sales';
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('[Cache] Retornando vendas do cache');
      return cached;
    }
  }

  if (USE_MOCK) {
    const sales = loadMockData();
    cache.set(cacheKey, sales);
    return sales;
  }

  console.log('[Hotmart] Buscando histórico completo de vendas...');
  const sales = await fetchAllPages('/payments/api/v1/sales/history');
  cache.set(cacheKey, sales);
  return sales;
}

// ── Buscar sumário de vendas ─────────────────────────────────────────────────
async function fetchSalesSummary(forceRefresh = false) {
  const cacheKey = 'sales_summary';
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached) return cached;
  }

  console.log('[Hotmart] Buscando sumário de vendas...');
  const summary = await fetchAllPages('/payments/api/v1/sales/summary');
  cache.set(cacheKey, summary);
  return summary;
}

// ── Buscar participantes (compradores) ──────────────────────────────────────
async function fetchParticipants(forceRefresh = false) {
  const cacheKey = 'participants';
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached) return cached;
  }

  console.log('[Hotmart] Buscando participantes...');
  const participants = await fetchAllPages('/payments/api/v1/sales/users');
  cache.set(cacheKey, participants);
  return participants;
}

// ── Processar dados para os gráficos ────────────────────────────────────────
function processSalesData(sales) {
  const totalRevenue = { BRL: 0, USD: 0, EUR: 0 };
  const salesByMonth = {};
  const salesByProduct = {};
  const salesByStatus = {};
  const salesByPaymentType = {};
  const revenueByMonth = {};
  const dailySales = {};

  sales.forEach(sale => {
    const status = sale.purchase?.status || sale.status || 'UNKNOWN';
    const currency = sale.purchase?.price?.currency_value || sale.price?.currency_value || 'BRL';
    const value = parseFloat(sale.purchase?.price?.value || sale.price?.value || 0);
    const productName = sale.product?.name || sale.product_name || 'Produto desconhecido';
    const paymentType = sale.purchase?.payment?.type || sale.payment_type || 'OUTROS';

    // Data da compra
    const dateMs = sale.purchase?.order_date || sale.purchase_date || Date.now();
    const date = new Date(dateMs);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const dayKey = date.toISOString().split('T')[0];

    // Receita total (apenas aprovadas)
    if (['APPROVED', 'COMPLETE', 'COMPLETED'].includes(status)) {
      totalRevenue[currency] = (totalRevenue[currency] || 0) + value;

      // Receita por mês
      if (!revenueByMonth[monthKey]) revenueByMonth[monthKey] = {};
      revenueByMonth[monthKey][currency] = (revenueByMonth[monthKey][currency] || 0) + value;
    }

    // Vendas por mês
    salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + 1;

    // Vendas por dia
    dailySales[dayKey] = (dailySales[dayKey] || 0) + 1;

    // Vendas por produto
    if (!salesByProduct[productName]) salesByProduct[productName] = { count: 0, revenue: 0 };
    salesByProduct[productName].count += 1;
    if (['APPROVED', 'COMPLETE', 'COMPLETED'].includes(status)) {
      salesByProduct[productName].revenue += value;
    }

    // Vendas por status
    salesByStatus[status] = (salesByStatus[status] || 0) + 1;

    // Vendas por forma de pagamento
    salesByPaymentType[paymentType] = (salesByPaymentType[paymentType] || 0) + 1;
  });

  // Ordenar meses
  const sortedMonths = Object.keys(salesByMonth).sort();
  const sortedDays = Object.keys(dailySales).sort().slice(-30); // últimos 30 dias

  return {
    totalSales: sales.length,
    totalRevenue,
    approvedSales: salesByStatus['APPROVED'] || salesByStatus['COMPLETE'] || salesByStatus['COMPLETED'] || 0,
    refundedSales: salesByStatus['REFUNDED'] || 0,
    cancelledSales: salesByStatus['CANCELLED'] || salesByStatus['CANCELED'] || 0,
    salesByMonth: {
      labels: sortedMonths,
      data: sortedMonths.map(m => salesByMonth[m])
    },
    revenueByMonth: {
      labels: sortedMonths,
      data: sortedMonths.map(m => revenueByMonth[m]?.BRL || 0)
    },
    dailySales: {
      labels: sortedDays,
      data: sortedDays.map(d => dailySales[d] || 0)
    },
    salesByProduct: Object.entries(salesByProduct)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data })),
    salesByStatus: Object.entries(salesByStatus).map(([status, count]) => ({ status, count })),
    salesByPaymentType: Object.entries(salesByPaymentType).map(([type, count]) => ({ type, count })),
    lastUpdated: new Date().toISOString()
  };
}

module.exports = { fetchAllSales, fetchSalesSummary, fetchParticipants, processSalesData, refreshToken };
