import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'singlevault_secret';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Preencha usuário e senha.' });
  const db = await getDb();
  const result = await db.query(`SELECT * FROM users WHERE username = $1`, [username]);
  if (!result.rows.length) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  const user = result.rows[0];
  if (user.status === 'inativo') return res.status(403).json({ error: 'Esta conta está desativada. Contate o administrador.' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, name, password } = req.body;
  if (!username || !name || !password) return res.status(400).json({ error: 'Preencha todos os campos.' });
  if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  const db = await getDb();
  const exists = await db.query(`SELECT id FROM users WHERE username = $1`, [username]);
  if (exists.rows.length) return res.status(409).json({ error: 'Este usuário já existe.' });
  const hashed = await bcrypt.hash(password, 10);
  const id = uuid();
  await db.query(
    `INSERT INTO users VALUES ($1,$2,$3,$4,'usuario','ativo',$5)`,
    [id, username, name, hashed, new Date().toISOString()]
  );
  const token = jwt.sign({ id, username, name, role: 'usuario' }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id, username, name, role: 'usuario' } });
});

export default router;