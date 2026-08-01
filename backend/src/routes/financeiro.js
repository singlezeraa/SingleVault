import express from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

function addMonths(key, n) {
  let [y, m] = key.split('-').map(Number);
  m += n; while (m > 12) { m -= 12; y++; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── RECEITAS ───────────────────────────────────────────────

router.get('/receitas', authMiddleware, async (req, res) => {
  const { monthKey } = req.query;
  const db = await getDb();
  const query = monthKey
    ? `SELECT * FROM receitas WHERE "userId" = $1 AND substr(data,1,7) = $2 ORDER BY data DESC`
    : `SELECT * FROM receitas WHERE "userId" = $1 ORDER BY data DESC`;
  const params = monthKey ? [req.user.id, monthKey] : [req.user.id];
  const result = await db.query(query, params);
  res.json(result.rows);
});

router.post('/receitas', authMiddleware, async (req, res) => {
  const { descricao, valor, data, tipo, obs } = req.body;
  if (!descricao || !valor || !data) return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  const db = await getDb();
  const id = uuid();
  await db.query(
    `INSERT INTO receitas VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, req.user.id, descricao, valor, data, tipo || 'outro', obs || '', new Date().toISOString()]
  );
  res.status(201).json({ id, descricao, valor, data, tipo, obs });
});

router.delete('/receitas/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  await db.query(`DELETE FROM receitas WHERE id = $1 AND "userId" = $2`, [req.params.id, req.user.id]);
  res.json({ success: true });
});

// ─── GASTOS ─────────────────────────────────────────────────

router.get('/gastos', authMiddleware, async (req, res) => {
  const { monthKey } = req.query;
  const db = await getDb();
  const query = monthKey
    ? `SELECT * FROM gastos WHERE "userId" = $1 AND "monthKey" = $2 ORDER BY data DESC`
    : `SELECT * FROM gastos WHERE "userId" = $1 ORDER BY data DESC`;
  const params = monthKey ? [req.user.id, monthKey] : [req.user.id];
  const result = await db.query(query, params);
  res.json(result.rows);
});

router.post('/gastos', authMiddleware, async (req, res) => {
  const { descricao, valor, data, categoria, tipo, pagamento, obs } = req.body;
  if (!descricao || !valor || !data) return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  const db = await getDb();
  const id = uuid();
  const monthKey = data.substring(0, 7);
  await db.query(
    `INSERT INTO gastos VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,NULL,NULL,$10,$11)`,
    [id, req.user.id, descricao, valor, data, categoria, tipo, pagamento, obs || '', monthKey, new Date().toISOString()]
  );
  res.status(201).json({ id, descricao, valor, data, categoria, tipo, pagamento, obs });
});

router.delete('/gastos/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const result = await db.query(
    `SELECT "fixoId", "parceladoId" FROM gastos WHERE id = $1 AND "userId" = $2`,
    [req.params.id, req.user.id]
  );
  if (result.rows.length) {
    const { fixoId, parceladoId } = result.rows[0];
    if (fixoId || parceladoId) return res.status(400).json({ error: 'Gastos automáticos não podem ser excluídos diretamente.' });
  }
  await db.query(`DELETE FROM gastos WHERE id = $1 AND "userId" = $2`, [req.params.id, req.user.id]);
  res.json({ success: true });
});

// ─── FIXOS ──────────────────────────────────────────────────

router.get('/fixos', authMiddleware, async (req, res) => {
  const db = await getDb();
  const result = await db.query(`SELECT * FROM fixos WHERE "userId" = $1 ORDER BY "createdAt" ASC`, [req.user.id]);
  res.json(result.rows);
});

router.post('/fixos', authMiddleware, async (req, res) => {
  const { descricao, valor, categoria, pagamento, dia } = req.body;
  if (!descricao || !valor || !dia) return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  const db = await getDb();
  const id = uuid();
  await db.query(
    `INSERT INTO fixos VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, req.user.id, descricao, valor, categoria, pagamento, dia, new Date().toISOString()]
  );
  await applyFixoToMonth(db, { id, userId: req.user.id, descricao, valor, categoria, pagamento, dia }, currentMonth());
  res.status(201).json({ id, descricao, valor, categoria, pagamento, dia });
});

router.delete('/fixos/:id', authMiddleware, async (req, res) => {
  const now = currentMonth();
  const db = await getDb();
  await db.query(`DELETE FROM fixos WHERE id = $1 AND "userId" = $2`, [req.params.id, req.user.id]);
  await db.query(
    `DELETE FROM gastos WHERE "fixoId" = $1 AND "userId" = $2 AND "monthKey" >= $3`,
    [req.params.id, req.user.id, now]
  );
  res.json({ success: true });
});

router.post('/fixos/apply/:monthKey', authMiddleware, async (req, res) => {
  const db = await getDb();
  const mKey = req.params.monthKey;
  await db.query(`DELETE FROM gastos WHERE "fixoId" IS NOT NULL AND "userId" = $1 AND "monthKey" = $2`, [req.user.id, mKey]);
  const fixos = await db.query(`SELECT * FROM fixos WHERE "userId" = $1`, [req.user.id]);
  for (const f of fixos.rows) await applyFixoToMonth(db, f, mKey);
  res.json({ success: true, applied: fixos.rows.length });
});

// ─── PARCELADOS ─────────────────────────────────────────────

router.get('/parcelados', authMiddleware, async (req, res) => {
  const db = await getDb();
  const result = await db.query(`SELECT * FROM parcelados WHERE "userId" = $1 ORDER BY "createdAt" ASC`, [req.user.id]);
  res.json(result.rows);
});

router.post('/parcelados', authMiddleware, async (req, res) => {
  const { descricao, valorTotal, parcelas, mesInicio, dia, categoria, pagamento } = req.body;
  if (!descricao || !valorTotal || !parcelas) return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  const valorParcela = parseFloat((valorTotal / parcelas).toFixed(2));
  const db = await getDb();
  const id = uuid();
  await db.query(
    `INSERT INTO parcelados VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, req.user.id, descricao, valorTotal, valorParcela, parcelas, mesInicio, dia, categoria, pagamento, new Date().toISOString()]
  );
  const now = currentMonth();
  for (let i = 0; i < parcelas; i++) {
    const mKey = addMonths(mesInicio, i);
    if (mKey <= now) await applyParcelaToMonth(db, { id, userId: req.user.id, descricao, valorParcela, valorTotal, parcelas, mesInicio, dia, categoria, pagamento }, mKey, i);
  }
  res.status(201).json({ id, descricao, valorTotal, valorParcela, parcelas, mesInicio, dia, categoria, pagamento });
});

router.delete('/parcelados/:id', authMiddleware, async (req, res) => {
  const now = currentMonth();
  const db = await getDb();
  await db.query(`DELETE FROM parcelados WHERE id = $1 AND "userId" = $2`, [req.params.id, req.user.id]);
  await db.query(
    `DELETE FROM gastos WHERE "parceladoId" = $1 AND "userId" = $2 AND "monthKey" >= $3`,
    [req.params.id, req.user.id, now]
  );
  res.json({ success: true });
});

// ─── AUTO APPLY ─────────────────────────────────────────────

router.post('/auto-apply/:monthKey', authMiddleware, async (req, res) => {
  const db = await getDb();
  const mKey = req.params.monthKey;
  const fixos = await db.query(`SELECT * FROM fixos WHERE "userId" = $1`, [req.user.id]);
  for (const f of fixos.rows) await applyFixoToMonth(db, f, mKey);
  const pars = await db.query(`SELECT * FROM parcelados WHERE "userId" = $1`, [req.user.id]);
  for (const p of pars.rows) {
    for (let i = 0; i < p.parcelas; i++) {
      if (addMonths(p.mesInicio, i) === mKey) await applyParcelaToMonth(db, p, mKey, i);
    }
  }
  res.json({ success: true });
});

// ─── HELPERS ────────────────────────────────────────────────

async function applyFixoToMonth(db, f, mKey) {
  const exists = await db.query(
    `SELECT id FROM gastos WHERE "fixoId" = $1 AND "monthKey" = $2`,
    [f.id, mKey]
  );
  if (exists.rows.length) return;
  const [y, mo] = mKey.split('-').map(Number);
  const maxDia = new Date(y, mo, 0).getDate();
  const diaReal = Math.min(f.dia, maxDia);
  const data = `${mKey}-${String(diaReal).padStart(2, '0')}`;
  await db.query(
    `INSERT INTO gastos VALUES ($1,$2,$3,$4,$5,$6,'fixo',$7,'Gasto fixo automático',$8,NULL,NULL,$9,$10)`,
    [uuid(), f.userId, f.descricao, f.valor, data, f.categoria, f.pagamento, f.id, mKey, new Date().toISOString()]
  );
}

async function applyParcelaToMonth(db, p, mKey, i) {
  const exists = await db.query(
    `SELECT id FROM gastos WHERE "parceladoId" = $1 AND "parcelNum" = $2`,
    [p.id, i + 1]
  );
  if (exists.rows.length) return;
  const [y, mo] = mKey.split('-').map(Number);
  const maxDia = new Date(y, mo, 0).getDate();
  const diaReal = Math.min(p.dia, maxDia);
  const data = `${mKey}-${String(diaReal).padStart(2, '0')}`;
  const desc = `${p.descricao} (${i + 1}/${p.parcelas})`;
  const obs = `Parcela ${i + 1} de ${p.parcelas}`;
  await db.query(
    `INSERT INTO gastos VALUES ($1,$2,$3,$4,$5,$6,'parcelado',$7,$8,NULL,$9,$10,$11,$12)`,
    [uuid(), p.userId, desc, p.valorParcela, data, p.categoria, p.pagamento, obs, p.id, i + 1, mKey, new Date().toISOString()]
  );
}

export default router;