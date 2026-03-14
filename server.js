require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
 
const app = express();
const PORT = process.env.PORT || 3000;
 
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
 
// Rotas da API
app.use('/api', require('./routes/api'));
 
// Qualquer outra rota → frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
 
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Hotmart Dashboard rodando em http://0.0.0.0:${PORT}`);
  console.log(`📊 Ambiente: ${process.env.HOTMART_ENV || 'production'}`);
  console.log(`🔑 Token configurado: ${process.env.HOTMART_TOKEN ? '✅ Sim' : '❌ Não (configure no .env)'}\n`);
});