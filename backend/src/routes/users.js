import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getDb, persist } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();
const esc = s => String(s).replace(/'/g, "''");

function rowsToObjects(result) {
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(v => Object.fromEntries(columns.map((c, i) => [c, v[i]])));
}

// GET /api/users — lista todos (admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  const db = await getDb();
  const rows = db.exec('SELECT id,username,name,role,status,createdAt FROM users ORDER BY createdAt ASC');
  res.json(rowsToObjects(rows));
});

// POST /api/users — criar usuário (admin)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  const { username, name, password, role } = req.body;
  if (!username || !name || !password) return res.status(400).json({ error: 'Preencha todos os campos.' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
  const db = await getDb();
  const exists = db.exec(`SELECT id FROM users WHERE username='${esc(username)}'`);
  if (exists.length && exists[0].values.length) return res.status(409).json({ error: 'Usuário já existe.' });
  const hashed = await bcrypt.hash(password, 10);
  const id = uuid();
  const validRole = role === 'admin' ? 'admin' : 'usuario';
  db.run(`INSERT INTO users VALUES ('${id}','${esc(username)}','${esc(name)}','${hashed}','${validRole}','ativo','${new Date().toISOString()}')`);
  persist();
  res.status(201).json({ id, username, name, role: validRole, status: 'ativo' });
});

// PUT /api/users/:id — editar usuário (admin)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, password, role, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });
  if (password && password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
  const db = await getDb();
  const isSelf = id === req.user.id;
  let sql = `UPDATE users SET name='${esc(name)}'`;
  if (password) sql += `, password='${await bcrypt.hash(password, 10)}'`;
  if (!isSelf && role) sql += `, role='${role === 'admin' ? 'admin' : 'usuario'}'`;
  if (!isSelf && status) sql += `, status='${status === 'inativo' ? 'inativo' : 'ativo'}'`;
  sql += ` WHERE id='${esc(id)}'`;
  db.run(sql);
  persist();
  res.json({ success: true });
});

// DELETE /api/users/:id — excluir usuário (admin, não pode excluir a si mesmo)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) return res.status(400).json({ error: 'Você não pode excluir sua própria conta.' });
  const db = await getDb();
  db.run(`DELETE FROM users WHERE id='${esc(id)}'`);
  persist();
  res.json({ success: true });
});

export default router;
