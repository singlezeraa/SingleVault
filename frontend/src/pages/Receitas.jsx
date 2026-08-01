import { useEffect, useState } from 'react';
import { getReceitas, addReceita, deleteReceita } from '../data.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fmt, fmtDate, todayStr, REC_TYPES } from '../utils.js';
import { ConfirmModal, useToast } from '../components/UI.jsx';

export default function Receitas({ activeMonth }) {
  const { user } = useAuth();
  const toast = useToast();
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ descricao: '', valor: '', data: todayStr(), tipo: 'salario', obs: '' });
  const [loading, setLoading] = useState(false);
  const [del, setDel] = useState(null);

  const load = () => getReceitas(activeMonth).then(setList);
  useEffect(() => { load(); }, [activeMonth]);

  const submit = async e => {
    e.preventDefault();
    if (!form.descricao || !form.valor) { toast('Preencha todos os campos.', 'error'); return; }
    setLoading(true);
    try {
      await addReceita(user.id, { ...form, valor: parseFloat(form.valor) });
      setForm({ descricao: '', valor: '', data: todayStr(), tipo: 'salario', obs: '' });
      await load();
      toast(`Receita de ${fmt(parseFloat(form.valor))} registrada!`);
    } catch { toast('Erro ao registrar receita.', 'error'); }
    finally { setLoading(false); }
  };

  const doDelete = async () => {
    await deleteReceita(del);
    setDel(null); await load(); toast('Receita excluída.');
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="page-content">
      <ConfirmModal open={!!del} title="Excluir Receita" message="Tem certeza que deseja excluir esta receita?" onConfirm={doDelete} onCancel={() => setDel(null)} />
      <section className="panel form-panel">
        <div className="panel-header"><h2>Registrar Receita</h2></div>
        <form className="form-grid" onSubmit={submit}>
          <div className="form-group"><label>Descrição</label><input value={form.descricao} onChange={f('descricao')} placeholder="Ex: Salário, Freelance..." required /></div>
          <div className="form-group"><label>Valor (R$)</label><input type="number" value={form.valor} onChange={f('valor')} placeholder="0,00" min="0" step="0.01" required /></div>
          <div className="form-group"><label>Data</label><input type="date" value={form.data} onChange={f('data')} required /></div>
          <div className="form-group"><label>Tipo</label>
            <select value={form.tipo} onChange={f('tipo')}>
              <option value="salario">Salário</option><option value="freelance">Freelance</option>
              <option value="investimento">Investimento</option><option value="bonus">Bônus</option><option value="outro">Outro</option>
            </select>
          </div>
          <div className="form-group form-full"><label>Observação (opcional)</label><input value={form.obs} onChange={f('obs')} placeholder="Detalhes adicionais..." /></div>
          <div className="form-full form-actions"><button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Registrar Receita'}</button></div>
        </form>
      </section>
      <section className="panel">
        <div className="panel-header"><h2>Receitas do Mês</h2></div>
        {list.length === 0 ? <p className="empty-state">Nenhuma receita registrada neste mês.</p> :
          <div className="tx-list">
            {[...list].sort((a,b)=>b.data>a.data?1:-1).map(r => (
              <div key={r.id} className="tx-item">
                <div className="tx-icon income">{REC_TYPES[r.tipo] || '💰'}</div>
                <div className="tx-info">
                  <div className="tx-desc">{r.descricao}</div>
                  <div className="tx-meta">{fmtDate(r.data)} · {r.tipo}{r.obs ? ' · ' + r.obs : ''}</div>
                </div>
                <div className="tx-amount income">+ {fmt(r.valor)}</div>
                <button className="tx-delete" onClick={() => setDel(r.id)}>✕</button>
              </div>
            ))}
          </div>
        }
      </section>
    </div>
  );
}