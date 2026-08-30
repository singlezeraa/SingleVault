# 🔐 SingleVault — Gestão Financeira Pessoal
### Stack: React + Vite | Supabase (Auth + PostgreSQL + RLS)

---

## 🚀 Como rodar

### Pré-requisitos
- Node.js 18+
- Um projeto no [Supabase](https://supabase.com) com as tabelas criadas

```bash
cd frontend
npm install
npm run dev
# App rodando em http://localhost:5173
```

As credenciais do Supabase (URL + anon key) ficam em `frontend/src/supabase.js`.
A anon key é pública por design — a proteção real vem das políticas de RLS.

---

## 📋 Funcionalidades
| Tela | Descrição |
|------|-----------|
| Dashboard | Visão geral com cards, gráficos e comprometimento do orçamento |
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
├── frontend/
│   └── src/
│       ├── supabase.js     # Client do Supabase
│       ├── data.js         # Camada de dados (queries + lançamentos automáticos)
│       ├── context/        # AuthContext (Supabase Auth)
│       ├── components/     # Sidebar, UI (Toast, Modal, Spinner)
│       ├── pages/          # Uma page por tela
│       └── styles/         # global.css (tema escuro)
└── supabase/
    └── rls_policies.sql    # Row Level Security + trigger anti-escalada de cargo
```

---

## 🗄️ Banco de dados

Tabelas: `perfis`, `receitas`, `gastos`, `fixos`, `parcelados` (colunas em `snake_case`).

Os perfis são criados por um trigger no signup (`auth.users` → `perfis`).
O login usa `username`, convertido internamente para `username@singlevault.local`,
já que o Supabase Auth exige email.

### Lançamentos automáticos
Gastos fixos e parcelas geram linhas em `gastos` automaticamente:
- **Idempotência**: por `(fixo_id, month_key)` e `(parcelado_id, parcel_num)`
- **Dia de vencimento**: limitado ao último dia do mês (ex.: dia 31 vira 28 em fevereiro)
- `autoApply()` roda no login e ao trocar o mês ativo
- Gastos automáticos não podem ser excluídos individualmente — só removendo o fixo/parcelado,
  o que apaga apenas os lançamentos do mês atual em diante

---

## 🔒 Segurança
Antes de usar em produção, execute `supabase/rls_policies.sql` no SQL Editor do Supabase.
O script é idempotente e garante que:
- Cada usuário só acessa seus próprios dados financeiros
- Somente admins alteram `role` e `status` (trigger `prevent_role_escalation`)
- Clientes não inserem diretamente em `perfis`

---

## ☁️ Deploy
Frontend na **Vercel** (`frontend/vercel.json` já configurado com rewrite para SPA).
Não há backend próprio — o app fala direto com o Supabase.
