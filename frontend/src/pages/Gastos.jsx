import { useEffect, useRef, useState } from 'react';
import { getGastos, addGasto, updateGasto, deleteGasto } from '../data.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fmt, fmtDate, todayStr, CATS } from '../utils.js';
import { ConfirmModal, useToast } from '../components/UI.jsx';

const emptyForm = () => ({ descricao:'', valor:'', data:todayStr(), categoria:'alimentacao', tipo:'variavel', pagamento:'debito', obs:'' });

export default function Gastos({ activeMonth }) {
  const { user } = useAuth();
  const toast = useToast();
  const [list, setList] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [del, setDel] = useState(null);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const formRef = useRef(null);

  const load = () => getGastos(activeMonth).then(setList);

  const cancelEdit = () => { setEditId(null); setForm(emptyForm()); };

  // Ao trocar de mes o item em edicao pode nao estar mais na lista.
  useEffect(() => { load(); cancelEdit(); }, [activeMonth]);

  const startEdit = g => {
    setEditId(g.id);
    setForm({
      descricao: g.descricao, valor: String(g.valor), data: g.data,
      categoria: g.categoria, tipo: g.tipo, pagamento: g.pagamento, obs: g.obs || ''
    });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async e => {
    e.preventDefault();
    if (!form.descricao || !form.valor) { toast('Preencha todos os campos.', 'error'); return; }
    setLoading(true);
    const valor = parseFloat(form.valor);
    try {
      if (editId) {
        await updateGasto(editId, { ...form, valor });
        cancelEdit();
        await load(); toast('Gasto atualizado!');
      } else {
        await addGasto(user.id, { ...form, valor });
        setForm(emptyForm());
        await load(); toast(`Gasto de ${fmt(valor)} lançado!`);
      }
    } catch (err) {
      toast(err.message || (editId ? 'Erro ao atualizar gasto.' : 'Erro ao lançar gasto.'), 'error');
    } finally { setLoading(false); }
  };

  const doDelete = async () => {
    try {
      if (del === editId) cancelEdit();
      await deleteGasto(del); setDel(null); await load(); toast('Gasto excluído.');
    }
    catch (err) { toast(err.message || 'Erro ao excluir.', 'error'); setDel(null); }
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const filtered = list.filter(g => !filtro || g.categoria === filtro);

  return (
    <div className="page-content">
      <ConfirmModal open={!!del} title="Excluir Gasto" message="Tem certeza que deseja excluir este gasto?" onConfirm={doDelete} onCancel={() => setDel(null)} />
      <section className="panel form-panel" ref={formRef}>
        <div className="panel-header"><h2>{editId ? 'Editar Gasto' : 'Lançar Gasto'}</h2></div>
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
          <div className="form-full form-actions">
            {editId && <button type="button" className="btn btn-outline" onClick={cancelEdit} disabled={loading}>Cancelar</button>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : editId ? 'Salvar Alterações' : 'Lançar Gasto'}
            </button>
          </div>
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
              const auto = !!(g.fixo_id || g.parcelado_id);
              return (
                <div key={g.id} className={`tx-item${g.id === editId ? ' editing' : ''}`}>
                  <div className={`tx-icon ${ic}`}>{c.emoji}</div>
                  <div className="tx-info">
                    <div className="tx-desc">{g.descricao}</div>
                    <div className="tx-meta">{fmtDate(g.data)} · {c.label} · {g.pagamento} <span className={`badge ${bc}`} style={{marginLeft:6}}>{g.tipo}</span></div>
                  </div>
                  <div className={`tx-amount ${ic}`}>- {fmt(g.valor)}</div>
                  <div className="tx-actions">
                    {!auto && <>
                      <button className="tx-edit" onClick={() => startEdit(g)} title="Editar gasto">✎</button>
                      <button className="tx-delete" onClick={() => setDel(g.id)} title="Excluir gasto">✕</button>
                    </>}
                  </div>
                </div>
              );
            })}
          </div>
        }
      </section>
    </div>
  );
}
