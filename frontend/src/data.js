import { supabase } from './supabase.js';

// Helper: mês atual no formato YYYY-MM
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(key, n) {
  let [y, m] = key.split('-').map(Number);
  m += n; while (m > 12) { m -= 12; y++; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

// ─── RECEITAS ───────────────────────────────────────────────

export async function getReceitas(monthKey) {
  let query = supabase.from('receitas').select('*').order('data', { ascending: false });
  if (monthKey) query = query.like('data', `${monthKey}%`);
  const { data } = await query;
  return data || [];
}

export async function addReceita(userId, r) {
  const { data } = await supabase.from('receitas').insert({
    user_id: userId, descricao: r.descricao, valor: r.valor,
    data: r.data, tipo: r.tipo, obs: r.obs || ''
  }).select().single();
  return data;
}

export async function deleteReceita(id) {
  await supabase.from('receitas').delete().eq('id', id);
}

// ─── GASTOS ─────────────────────────────────────────────────

export async function getGastos(monthKey) {
  let query = supabase.from('gastos').select('*').order('data', { ascending: false });
  if (monthKey) query = query.eq('month_key', monthKey);
  const { data } = await query;
  return data || [];
}

export async function addGasto(userId, g) {
  const { data } = await supabase.from('gastos').insert({
    user_id: userId, descricao: g.descricao, valor: g.valor, data: g.data,
    categoria: g.categoria, tipo: g.tipo, pagamento: g.pagamento,
    obs: g.obs || '', month_key: g.data.substring(0, 7)
  }).select().single();
  return data;
}

export async function deleteGasto(id) {
  const { data: gasto } = await supabase.from('gastos').select('fixo_id, parcelado_id').eq('id', id).single();
  if (gasto?.fixo_id || gasto?.parcelado_id) {
    throw new Error('Gastos automáticos não podem ser excluídos diretamente.');
  }
  await supabase.from('gastos').delete().eq('id', id);
}

// ─── FIXOS ──────────────────────────────────────────────────

export async function getFixos() {
  const { data } = await supabase.from('fixos').select('*').order('created_at');
  return data || [];
}

export async function addFixo(userId, f) {
  const { data } = await supabase.from('fixos').insert({
    user_id: userId, descricao: f.descricao, valor: f.valor,
    categoria: f.categoria, pagamento: f.pagamento, dia: f.dia
  }).select().single();
  await applyFixoToMonth(userId, data, currentMonth());
  return data;
}

export async function deleteFixo(id, userId) {
  const now = currentMonth();
  await supabase.from('fixos').delete().eq('id', id);
  await supabase.from('gastos').delete().eq('fixo_id', id).gte('month_key', now);
}

export async function applyFixosToMonth(userId, monthKey) {
  await supabase.from('gastos').delete().eq('user_id', userId).not('fixo_id', 'is', null).eq('month_key', monthKey);
  const fixos = await getFixos();
  for (const f of fixos) await applyFixoToMonth(userId, f, monthKey);
}

async function applyFixoToMonth(userId, f, monthKey) {
  const { data: existe } = await supabase.from('gastos').select('id').eq('fixo_id', f.id).eq('month_key', monthKey).maybeSingle();
  if (existe) return;
  const [y, mo] = monthKey.split('-').map(Number);
  const maxDia = new Date(y, mo, 0).getDate();
  const dia = Math.min(f.dia, maxDia);
  await supabase.from('gastos').insert({
    user_id: userId, descricao: f.descricao, valor: f.valor,
    data: `${monthKey}-${String(dia).padStart(2, '0')}`,
    categoria: f.categoria, tipo: 'fixo', pagamento: f.pagamento,
    obs: 'Gasto fixo automático', fixo_id: f.id, month_key: monthKey
  });
}

// ─── PARCELADOS ─────────────────────────────────────────────

export async function getParcelados() {
  const { data } = await supabase.from('parcelados').select('*').order('created_at');
  return data || [];
}

export async function addParcelado(userId, p) {
  const valorParcela = parseFloat((p.valorTotal / p.parcelas).toFixed(2));
  const { data } = await supabase.from('parcelados').insert({
    user_id: userId, descricao: p.descricao, valor_total: p.valorTotal,
    valor_parcela: valorParcela, parcelas: p.parcelas, mes_inicio: p.mesInicio,
    dia: p.dia, categoria: p.categoria, pagamento: p.pagamento
  }).select().single();

  const now = currentMonth();
  for (let i = 0; i < p.parcelas; i++) {
    const mKey = addMonths(p.mesInicio, i);
    if (mKey <= now) await applyParcelaToMonth(userId, data, mKey, i);
  }
  return data;
}

export async function deleteParcelado(id, userId) {
  const now = currentMonth();
  await supabase.from('parcelados').delete().eq('id', id);
  await supabase.from('gastos').delete().eq('parcelado_id', id).gte('month_key', now);
}

async function applyParcelaToMonth(userId, p, monthKey, i) {
  const { data: existe } = await supabase.from('gastos').select('id').eq('parcelado_id', p.id).eq('parcel_num', i + 1).maybeSingle();
  if (existe) return;
  const [y, mo] = monthKey.split('-').map(Number);
  const maxDia = new Date(y, mo, 0).getDate();
  const dia = Math.min(p.dia, maxDia);
  await supabase.from('gastos').insert({
    user_id: userId, descricao: `${p.descricao} (${i + 1}/${p.parcelas})`,
    valor: p.valor_parcela, data: `${monthKey}-${String(dia).padStart(2, '0')}`,
    categoria: p.categoria, tipo: 'parcelado', pagamento: p.pagamento,
    obs: `Parcela ${i + 1} de ${p.parcelas}`, parcelado_id: p.id,
    parcel_num: i + 1, month_key: monthKey
  });
}

// ─── AUTO APPLY ─────────────────────────────────────────────

export async function autoApply(userId, monthKey) {
  const fixos = await getFixos();
  for (const f of fixos) await applyFixoToMonth(userId, f, monthKey);
  const parcelados = await getParcelados();
  for (const p of parcelados) {
    for (let i = 0; i < p.parcelas; i++) {
      if (addMonths(p.mes_inicio, i) === monthKey) await applyParcelaToMonth(userId, p, monthKey, i);
    }
  }
}

// ─── USUÁRIOS (admin) ───────────────────────────────────────

export async function getUsuarios() {
  const { data } = await supabase.from('perfis').select('*').order('created_at');
  return data || [];
}

export async function updateUsuario(id, updates) {
  await supabase.from('perfis').update(updates).eq('id', id);
}

export async function deleteUsuario(id) {
  await supabase.from('perfis').delete().eq('id', id);
}