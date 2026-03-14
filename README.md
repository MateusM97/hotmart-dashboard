# 📊 Hotmart Dashboard

Dashboard de vendas para a API Hotmart. Exibe histórico completo de vendas com gráficos interativos.

---

## 🚀 Instalação

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure o arquivo `.env`

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Edite o `.env` com seus dados:

```env
HOTMART_TOKEN=seu_token_aqui
HOTMART_ENV=production
PORT=3000
```

---

## 🔑 Como obter o Token Hotmart

### Opção A — Token Direto (mais simples)
1. Acesse [developers.hotmart.com](https://developers.hotmart.com)
2. Faça login na sua conta Hotmart
3. Vá em **Ferramentas → Credenciais de API**
4. Gere um token de acesso
5. Cole em `HOTMART_TOKEN=` no seu `.env`

### Opção B — OAuth2 (token se renova automaticamente)
1. Obtenha `Client ID` e `Client Secret` no painel de desenvolvedores
2. Gere o `Basic Auth` em Base64:
   ```
   echo -n "CLIENT_ID:CLIENT_SECRET" | base64
   ```
3. Preencha no `.env`:
   ```env
   HOTMART_CLIENT_ID=...
   HOTMART_CLIENT_SECRET=...
   HOTMART_BASIC_AUTH=resultado_do_base64_acima
   ```

---

## ▶️ Rodando o projeto

```bash
# Produção
npm start

# Desenvolvimento (auto-reload)
npm run dev
```

Acesse: **http://localhost:3000**

---

## 📈 Funcionalidades

- ✅ **Histórico completo** de vendas (paginação automática)
- ✅ **Atualização manual** via botão "Atualizar Dados"
- ✅ **Cache** de 5 minutos (evita requisições desnecessárias)
- ✅ **KPIs**: Receita total, total de vendas, aprovadas, reembolsos
- ✅ **Gráfico**: Vendas por mês (barras)
- ✅ **Gráfico**: Faturamento mensal em BRL (linha)
- ✅ **Gráfico**: Status das vendas (rosca)
- ✅ **Gráfico**: Formas de pagamento (rosca)
- ✅ **Gráfico**: Vendas dos últimos 30 dias (barras)
- ✅ **Tabela**: Top 10 produtos por número de vendas e receita

---

## 🌐 Deploy no seu domínio

### Opção 1 — VPS (recomendado)

```bash
# Clone o projeto no servidor
git clone seu-repo /var/www/hotmart-dashboard
cd /var/www/hotmart-dashboard
npm install

# Use PM2 para manter rodando
npm install -g pm2
pm2 start server.js --name hotmart-dashboard
pm2 save
pm2 startup
```

Configure o Nginx como proxy reverso:

```nginx
server {
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Depois ative SSL com Certbot:
```bash
certbot --nginx -d seu-dominio.com
```

### Opção 2 — Railway / Render / Fly.io

1. Suba o código no GitHub
2. Conecte ao Railway/Render
3. Configure as variáveis de ambiente no painel
4. Deploy automático ✅

---

## 🗂️ Estrutura do projeto

```
hotmart-dashboard/
├── server.js              # Servidor Express
├── package.json
├── .env.example           # Template de configuração
├── routes/
│   └── api.js             # Endpoints da API
├── services/
│   └── hotmart.js         # Integração com a API Hotmart
└── public/
    ├── index.html         # Frontend
    ├── css/style.css      # Estilos
    └── js/app.js          # Lógica do dashboard
```

---

## ❓ Solução de problemas

| Erro | Solução |
|------|---------|
| `401 Unauthorized` | Token expirado ou inválido. Gere um novo no painel Hotmart. |
| `403 Forbidden` | Token sem permissão para acessar vendas. Verifique as permissões. |
| `No sales found` | Conta sem vendas ou ambiente errado (`sandbox` vs `production`). |
| Dados desatualizados | Clique em **Atualizar Dados** no dashboard. |

---

## 🔗 Links úteis

- [Documentação API Hotmart](https://developers.hotmart.com/docs/pt-BR/)
- [Painel de Desenvolvedores Hotmart](https://developers.hotmart.com)
