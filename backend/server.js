import express from 'express';
import cors from 'cors';
import { getDb } from './src/db.js';
import authRoutes from './src/routes/auth.js';
import usersRoutes from './src/routes/users.js';
import financeiroRoutes from './src/routes/financeiro.js';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://single-vault-jxb2.vercel.app',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true
}));

app.use(express.json());

app.use('/api/auth',       authRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api/financeiro', financeiroRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'SingleVault API v2 - PostgreSQL' }));

async function seedAdmin() {
  const db = await getDb();
  const exists = await db.query(`SELECT id FROM users WHERE username = $1`, ['admin']);
  if (!exists.rows.length) {
    const hashed = await bcrypt.hash('Xk9mR4bW2nL7qT5j', 10);
    await db.query(
      `INSERT INTO users VALUES ($1,$2,$3,$4,'admin','ativo',$5)`,
      [uuid(), 'admin', 'Administrador', hashed, new Date().toISOString()]
    );
    console.log('✅ Admin criado automaticamente.');
  }
}

seedAdmin().then(() => {
  app.listen(PORT, () => {
    console.log(`🔐 SingleVault API (PostgreSQL) rodando em http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Erro ao conectar ao banco:', err.message);
  process.exit(1);
});