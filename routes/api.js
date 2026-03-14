const express = require('express');
const router = express.Router();
const { fetchAllSales, processSalesData } = require('../services/hotmart');

// GET /api/dashboard - retorna todos os dados processados
router.get('/dashboard', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const sales = await fetchAllSales(forceRefresh);
    const processed = processSalesData(sales);
    res.json({ success: true, data: processed, rawCount: sales.length });
  } catch (err) {
    console.error('[API] Erro ao buscar dashboard:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      hint: 'Verifique se o token no .env está correto e válido.'
    });
  }
});

// GET /api/sales/raw - retorna vendas brutas (para debug)
router.get('/sales/raw', async (req, res) => {
  try {
    const sales = await fetchAllSales(false);
    res.json({ success: true, count: sales.length, sample: sales.slice(0, 3) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/refresh - força atualização dos dados
router.post('/refresh', async (req, res) => {
  try {
    console.log('[API] Forçando atualização dos dados...');
    const sales = await fetchAllSales(true);
    const processed = processSalesData(sales);
    res.json({ success: true, data: processed, rawCount: sales.length, message: 'Dados atualizados com sucesso!' });
  } catch (err) {
    console.error('[API] Erro ao atualizar:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/status - health check
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    env: process.env.HOTMART_ENV || 'production',
    tokenConfigured: !!process.env.HOTMART_TOKEN,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
