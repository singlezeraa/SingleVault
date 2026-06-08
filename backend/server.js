import express from 'express';
import cors from 'cors';
import { getDb, persist } from './src/db.js';
import authRoutes from './src/routes/auth.js';
import usersRoutes from './src/routes/users.js';
import financeiroRoutes from './src/routes/financeiro.js';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

app.use('/api/auth',       authRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api/financeiro', financeiroRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'SingleVault API' }));

// Inicializa admin padrão se não existir
async function seedAdmin() {
  const db = await getDb();
  const exists = db.exec(`SELECT id FROM users WHERE username='admin'`);
  if (!exists.length || !exists[0].values.length) {
    const hashed = await bcrypt.hash('Xk9mR4bW2nL7qT5j', 10);
    db.run(`INSERT INTO users VALUES ('${uuid()}','admin','Administrador','${hashed}','admin','ativo','${new Date().toISOString()}')`);
    persist(db);
    console.log('✅ Admin criado automaticamente.');
  }
}

seedAdmin().then(() => {
  app.listen(PORT, () => {
    console.log(`🔐 SingleVault API rodando em http://localhost:${PORT}`);
  });
});
