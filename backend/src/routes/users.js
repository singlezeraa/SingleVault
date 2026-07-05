import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  const db = await getDb();
  const result = await db.query(`SELECT id, username, name, role, status, "createdAt" FROM users ORDER BY "createdAt" ASC`);
  res.json(result.rows);
});

// POST /api/users
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  const { username, name, password, role } = req.body;
  if (!username || !name || !password) return res.status(400).json({ error: 'Preencha todos os campos.' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
  const db = await getDb();
  const exists = await db.query(`SELECT id FROM users WHERE username = $1`, [username]);
  if (exists.rows.length) return res.status(409).json({ error: 'Usuário já existe.' });
  const hashed = await bcrypt.hash(password, 10);
  const id = uuid();
  const validRole = role === 'admin' ? 'admin' : 'usuario';
  await db.query(
    `INSERT INTO users VALUES ($1,$2,$3,$4,$5,'ativo',$6)`,
    [id, username, name, hashed, validRole, new Date().toISOString()]
  );
  res.status(201).json({ id, username, name, role: validRole, status: 'ativo' });
});

// PUT /api/users/:id
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, password, role, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });
  if (password && password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
  const db = await getDb();
  const isSelf = id === req.user.id;
  let query = `UPDATE users SET name = $1`;
  const params = [name];
  let idx = 2;
  if (password) { query += `, password = $${idx}`; params.push(await bcrypt.hash(password, 10)); idx++; }
  if (!isSelf && role) { query += `, role = $${idx}`; params.push(role === 'admin' ? 'admin' : 'usuario'); idx++; }
  if (!isSelf && status) { query += `, status = $${idx}`; params.push(status === 'inativo' ? 'inativo' : 'ativo'); idx++; }
  query += ` WHERE id = $${idx}`;
  params.push(id);
  await db.query(query, params);
  res.json({ success: true });
});

// DELETE /api/users/:id
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) return res.status(400).json({ error: 'Você não pode excluir sua própria conta.' });
  const db = await getDb();
  await db.query(`DELETE FROM users WHERE id = $1`, [id]);
  res.json({ success: true });
});

export default router;