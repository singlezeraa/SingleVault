import express from 'express';
import { v4 as uuid } from 'uuid';
import { getDb, persist } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const esc = s => String(s ?? '').replace(/'/g, "''");

function rowsToObjects(result) {
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(v => Object.fromEntries(columns.map((c, i) => [c, v[i]])));
}

function addMonths(key, n) {
  let [y, m] = key.split('-').map(Number);
  m += n; while (m > 12) { m -= 12; y++; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

// ─── RECEITAS ───────────────────────────────────────────────

router.get('/receitas', authMiddleware, async (req, res) => {
  const { monthKey } = req.query;
  const db = await getDb();
  const where = monthKey ? `AND substr(data,1,7)='${esc(monthKey)}'` : '';
  const rows = db.exec(`SELECT * FROM receitas WHERE userId='${req.user.id}' ${where} ORDER BY data DESC`);
  res.json(rowsToObjects(rows));
});

router.post('/receitas', authMiddleware, async (req, res) => {
  const { descricao, valor, data, tipo, obs } = req.body;
  if (!descricao || !valor || !data) return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  const db = await getDb();
  const id = uuid();
  db.run(`INSERT INTO receitas VALUES ('${id}','${req.user.id}','${esc(descricao)}',${valor},'${esc(data)}','${esc(tipo)}','${esc(obs)}','${new Date().toISOString()}')`);
  persist();
  res.status(201).json({ id, descricao, valor, data, tipo, obs });
});

router.delete('/receitas/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  db.run(`DELETE FROM receitas WHERE id='${esc(req.params.id)}' AND userId='${req.user.id}'`);
  persist();
  res.json({ success: true });
});

// ─── GASTOS ─────────────────────────────────────────────────

router.get('/gastos', authMiddleware, async (req, res) => {
  const { monthKey } = req.query;
  const db = await getDb();
  const where = monthKey ? `AND monthKey='${esc(monthKey)}'` : '';
  const rows = db.exec(`SELECT * FROM gastos WHERE userId='${req.user.id}' ${where} ORDER BY data DESC`);
  res.json(rowsToObjects(rows));
});

router.post('/gastos', authMiddleware, async (req, res) => {
  const { descricao, valor, data, categoria, tipo, pagamento, obs } = req.body;
  if (!descricao || !valor || !data) return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  const db = await getDb();
  const id = uuid();
  const monthKey = data.substring(0, 7);
  db.run(`INSERT INTO gastos VALUES ('${id}','${req.user.id}','${esc(descricao)}',${valor},'${esc(data)}','${esc(categoria)}','${esc(tipo)}','${esc(pagamento)}','${esc(obs)}',NULL,NULL,NULL,'${monthKey}','${new Date().toISOString()}')`);
  persist();
  res.status(201).json({ id, descricao, valor, data, categoria, tipo, pagamento, obs });
});

router.delete('/gastos/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const rows = db.exec(`SELECT fixoId,parceladoId FROM gastos WHERE id='${esc(req.params.id)}' AND userId='${req.user.id}'`);
  if (rows.length && rows[0].values.length) {
    const [fixoId, parceladoId] = rows[0].values[0];
    if (fixoId || parceladoId) return res.status(400).json({ error: 'Gastos automáticos não podem ser excluídos diretamente.' });
  }
  db.run(`DELETE FROM gastos WHERE id='${esc(req.params.id)}' AND userId='${req.user.id}'`);
  persist();
  res.json({ success: true });
});

// ─── FIXOS ──────────────────────────────────────────────────

router.get('/fixos', authMiddleware, async (req, res) => {
  const db = await getDb();
  const rows = db.exec(`SELECT * FROM fixos WHERE userId='${req.user.id}' ORDER BY createdAt ASC`);
  res.json(rowsToObjects(rows));
});

router.post('/fixos', authMiddleware, async (req, res) => {
  const { descricao, valor, categoria, pagamento, dia } = req.body;
  if (!descricao || !valor || !dia) return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  const db = await getDb();
  const id = uuid();
  db.run(`INSERT INTO fixos VALUES ('${id}','${req.user.id}','${esc(descricao)}',${valor},'${esc(categoria)}','${esc(pagamento)}',${dia},'${new Date().toISOString()}')`);
  // Aplica no mês atual
  await applyFixoToMonth(db, { id, userId: req.user.id, descricao, valor, categoria, pagamento, dia }, currentMonth());
  persist();
  res.status(201).json({ id, descricao, valor, categoria, pagamento, dia });
});

router.delete('/fixos/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const now = currentMonth();
  db.run(`DELETE FROM fixos WHERE id='${esc(req.params.id)}' AND userId='${req.user.id}'`);
  db.run(`DELETE FROM gastos WHERE fixoId='${esc(req.params.id)}' AND userId='${req.user.id}' AND monthKey>='${now}'`);
  persist();
  res.json({ success: true });
});

// POST /fixos/apply/:monthKey — aplica todos os fixos no mês
router.post('/fixos/apply/:monthKey', authMiddleware, async (req, res) => {
  const db = await getDb();
  const mKey = req.params.monthKey;
  const fixosRows = db.exec(`SELECT * FROM fixos WHERE userId='${req.user.id}'`);
  const fixos = rowsToObjects(fixosRows);
  db.run(`DELETE FROM gastos WHERE fixoId IS NOT NULL AND userId='${req.user.id}' AND monthKey='${esc(mKey)}'`);
  for (const f of fixos) await applyFixoToMonth(db, f, mKey);
  persist();
  res.json({ success: true, applied: fixos.length });
});

// ─── PARCELADOS ─────────────────────────────────────────────

router.get('/parcelados', authMiddleware, async (req, res) => {
  const db = await getDb();
  const rows = db.exec(`SELECT * FROM parcelados WHERE userId='${req.user.id}' ORDER BY createdAt ASC`);
  res.json(rowsToObjects(rows));
});

router.post('/parcelados', authMiddleware, async (req, res) => {
  const { descricao, valorTotal, parcelas, mesInicio, dia, categoria, pagamento } = req.body;
  if (!descricao || !valorTotal || !parcelas) return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  const valorParcela = parseFloat((valorTotal / parcelas).toFixed(2));
  const db = await getDb();
  const id = uuid();
  db.run(`INSERT INTO parcelados VALUES ('${id}','${req.user.id}','${esc(descricao)}',${valorTotal},${valorParcela},${parcelas},'${esc(mesInicio)}',${dia},'${esc(categoria)}','${esc(pagamento)}','${new Date().toISOString()}')`);
  const now = currentMonth();
  for (let i = 0; i < parcelas; i++) {
    const mKey = addMonths(mesInicio, i);
    if (mKey <= now) await applyParcelaToMonth(db, { id, userId: req.user.id, descricao, valorParcela, valorTotal, parcelas, mesInicio, dia, categoria, pagamento }, mKey, i);
  }
  persist();
  res.status(201).json({ id, descricao, valorTotal, valorParcela, parcelas, mesInicio, dia, categoria, pagamento });
});

router.delete('/parcelados/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const now = currentMonth();
  db.run(`DELETE FROM parcelados WHERE id='${esc(req.params.id)}' AND userId='${req.user.id}'`);
  db.run(`DELETE FROM gastos WHERE parceladoId='${esc(req.params.id)}' AND userId='${req.user.id}' AND monthKey>='${now}'`);
  persist();
  res.json({ success: true });
});

// ─── AUTO APPLY (chamado ao trocar de mês) ──────────────────

router.post('/auto-apply/:monthKey', authMiddleware, async (req, res) => {
  const db = await getDb();
  const mKey = req.params.monthKey;
  const fixosRows = db.exec(`SELECT * FROM fixos WHERE userId='${req.user.id}'`);
  const fixos = rowsToObjects(fixosRows);
  for (const f of fixos) await applyFixoToMonth(db, f, mKey);
  const parsRows = db.exec(`SELECT * FROM parcelados WHERE userId='${req.user.id}'`);
  const pars = rowsToObjects(parsRows);
  for (const p of pars) {
    for (let i = 0; i < p.parcelas; i++) {
      if (addMonths(p.mesInicio, i) === mKey) await applyParcelaToMonth(db, p, mKey, i);
    }
  }
  persist();
  res.json({ success: true });
});

// ─── HELPERS ────────────────────────────────────────────────

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function applyFixoToMonth(db, f, mKey) {
  const exists = db.exec(`SELECT id FROM gastos WHERE fixoId='${f.id}' AND monthKey='${mKey}'`);
  if (exists.length && exists[0].values.length) return;
  const [y, mo] = mKey.split('-').map(Number);
  const maxDia = new Date(y, mo, 0).getDate();
  const diaReal = Math.min(f.dia, maxDia);
  const data = `${mKey}-${String(diaReal).padStart(2, '0')}`;
  const id = uuid();
  db.run(`INSERT INTO gastos VALUES ('${id}','${f.userId}','${esc(f.descricao)}',${f.valor},'${data}','${esc(f.categoria)}','fixo','${esc(f.pagamento)}','Gasto fixo automático','${f.id}',NULL,NULL,'${mKey}','${new Date().toISOString()}')`);
}

async function applyParcelaToMonth(db, p, mKey, i) {
  const exists = db.exec(`SELECT id FROM gastos WHERE parceladoId='${p.id}' AND parcelNum=${i + 1}`);
  if (exists.length && exists[0].values.length) return;
  const [y, mo] = mKey.split('-').map(Number);
  const maxDia = new Date(y, mo, 0).getDate();
  const diaReal = Math.min(p.dia, maxDia);
  const data = `${mKey}-${String(diaReal).padStart(2, '0')}`;
  const desc = `${esc(p.descricao)} (${i + 1}/${p.parcelas})`;
  const obs = `Parcela ${i + 1} de ${p.parcelas}`;
  const id = uuid();
  db.run(`INSERT INTO gastos VALUES ('${id}','${p.userId}','${desc}',${p.valorParcela},'${data}','${esc(p.categoria)}','parcelado','${esc(p.pagamento)}','${obs}',NULL,'${p.id}',${i + 1},'${mKey}','${new Date().toISOString()}')`);
}

export default router;
