# 🔐 SingleVault — Gestão Financeira Pessoal
### Stack: React + Vite | Node.js + Express | SQLite (sql.js)

---

## 🚀 Como rodar (primeira vez)

### Pré-requisitos
- Node.js 18+ instalado

### 1. Backend
```bash
cd backend
npm install
node server.js
# API rodando em http://localhost:3001
```

### 2. Frontend (outro terminal)
```bash
cd frontend
npm install
npm run dev
# App rodando em http://localhost:5173
```

Abra **http://localhost:5173** no navegador.

---

## 🔐 Credenciais padrão
| Campo   | Valor              |
|---------|--------------------|
| Usuário | `admin`            |
| Senha   | `Xk9mR4bW2nL7qT5j` |

---

## 📋 Funcionalidades
| Tela | Descrição |
|------|-----------|
| Dashboard | Visão geral com cards, gráficos e comprometimento |
| Receitas | Registrar entradas por tipo |
| Lançar Gasto | Gastos variáveis por categoria |
| Parcelados | Compras parceladas (1x–12x) com lançamento automático |
| Gastos Fixos | Despesas recorrentes com vencimento por dia |
| Histórico | Comparativo entre meses |
| Balanço Mensal | Resumo completo + exportação CSV |
| Usuários | Gestão de contas e cargos (somente admin) |

---

## 🗂️ Estrutura
```
singlevault/
├── backend/
│   ├── src/
│   │   ├── db.js              # SQLite com sql.js + persistência em arquivo
│   │   ├── middleware/auth.js  # JWT middleware
│   │   └── routes/
│   │       ├── auth.js        # Login / Registro
│   │       ├── users.js       # Gestão de usuários (admin)
│   │       └── financeiro.js  # Receitas, gastos, fixos, parcelados
│   └── server.js
├── frontend/
│   └── src/
│       ├── api/           # Axios + interceptors JWT
│       ├── context/       # AuthContext
│       ├── components/    # Sidebar, UI (Toast, Modal)
│       ├── pages/         # Uma page por tela
│       └── styles/        # global.css (tema escuro)
└── README.md
```

---

## ☁️ Deploy em nuvem (futuro)
O backend usa `sql.js` (SQLite puro JS). Para produção recomenda-se migrar para **PostgreSQL** — basta trocar as queries SQL e o provider de conexão. O frontend pode ser hospedado em **Vercel** ou **Netlify** e o backend em **Railway** ou **Render**.
