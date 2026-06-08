import { useEffect, useState } from 'react';
import api from '../api/index.js';
import { fmt, fmtDate, todayStr, CATS } from '../utils.js';
import { ConfirmModal, useToast } from '../components/UI.jsx';

export default function Gastos({ activeMonth }) {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [del, setDel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ descricao:'', valor:'', data:todayStr(), categoria:'alimentacao', tipo:'variavel', pagamento:'debito', obs:'' });

  const load = () => api.get(`/financeiro/gastos?monthKey=${activeMonth}`).then(r => setList(r.data));
  useEffect(() => { load(); }, [activeMonth]);

  const submit = async e => {
    e.preventDefault();
    if (!form.descricao || !form.valor) { toast('Preencha todos os campos.', 'error'); return; }
    setLoading(true);
    try {
      await api.post('/financeiro/gastos', { ...form, valor: parseFloat(form.valor) });
      setForm({ descricao:'', valor:'', data:todayStr(), categoria:'alimentacao', tipo:'variavel', pagamento:'debito', obs:'' });
      await load(); toast(`Gasto de ${fmt(parseFloat(form.valor))} lançado!`);
    } catch { toast('Erro ao lançar gasto.', 'error'); }
    finally { setLoading(false); }
  };

  const doDelete = async () => {
    try { await api.delete(`/financeiro/gastos/${del}`); setDel(null); await load(); toast('Gasto excluído.'); }
    catch (err) { toast(err.response?.data?.error || 'Erro ao excluir.', 'error'); setDel(null); }
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const filtered = list.filter(g => !filtro || g.categoria === filtro);

  return (
    <div className="page-content">
      <ConfirmModal open={!!del} title="Excluir Gasto" message="Tem certeza que deseja excluir este gasto?" onConfirm={doDelete} onCancel={() => setDel(null)} />
      <section className="panel form-panel">
        <div className="panel-header"><h2>Lançar Gasto</h2></div>
        <form className="form-grid" onSubmit={submit}>
          <div className="form-group"><label>Descrição</label><input value={form.descricao} onChange={f('descricao')} placeholder="Ex: Mercado, Academia..." required /></div>
          <div className="form-group"><label>Valor (R$)</label><input type="number" value={form.valor} onChange={f('valor')} placeholder="0,00" min="0" step="0.01" required /></div>
          <div className="form-group"><label>Data</label><input type="date" value={form.data} onChange={f('data')} required /></div>
          <div className="form-group"><label>Categoria</label>
            <select value={form.categoria} onChange={f('categoria')}>
              {Object.entries(CATS).map(([k,c]) => <option key={k} value={k}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Tipo</label>
            <select value={form.tipo} onChange={f('tipo')}><option value="variavel">Variável</option><option value="fixo">Fixo</option></select>
          </div>
          <div className="form-group"><label>Pagamento</label>
            <select value={form.pagamento} onChange={f('pagamento')}>
              <option value="debito">Débito</option><option value="credito">Crédito</option>
              <option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="boleto">Boleto</option>
            </select>
          </div>
          <div className="form-group form-full"><label>Observação (opcional)</label><input value={form.obs} onChange={f('obs')} placeholder="Detalhes adicionais..." /></div>
          <div className="form-full form-actions"><button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Lançar Gasto'}</button></div>
        </form>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Gastos do Mês</h2>
          <div className="filter-bar">
            <select className="filter-select" value={filtro} onChange={e => setFiltro(e.target.value)}>
              <option value="">Todas categorias</option>
              {Object.entries(CATS).map(([k,c]) => <option key={k} value={k}>{c.label}</option>)}
            </select>
          </div>
        </div>
        {filtered.length === 0 ? <p className="empty-state">Nenhum gasto lançado.</p> :
          <div className="tx-list">
            {[...filtered].sort((a,b)=>b.data>a.data?1:-1).map(g => {
              const c = CATS[g.categoria] || CATS.outros;
              const bc = g.tipo==='parcelado'?'badge-parcela':g.tipo==='fixo'?'badge-fixo':'badge-variavel';
              const ic = g.tipo==='parcelado'?'parcela':'expense';
              return (
                <div key={g.id} className="tx-item">
                  <div className={`tx-icon ${ic}`}>{c.emoji}</div>
                  <div className="tx-info">
                    <div className="tx-desc">{g.descricao}</div>
                    <div className="tx-meta">{fmtDate(g.data)} · {c.label} · {g.pagamento} <span className={`badge ${bc}`} style={{marginLeft:6}}>{g.tipo}</span></div>
                  </div>
                  <div className={`tx-amount ${ic}`}>- {fmt(g.valor)}</div>
                  {!g.fixoId && !g.parceladoId
                    ? <button className="tx-delete" onClick={() => setDel(g.id)}>✕</button>
                    : <span style={{width:28}} />
                  }
                </div>
              );
            })}
          </div>
        }
      </section>
    </div>
  );
}
