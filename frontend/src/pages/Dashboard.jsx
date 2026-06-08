import { useEffect, useState } from 'react';
import api from '../api/index.js';
import { fmt, fmtDate, CATS, REC_TYPES } from '../utils.js';
import { Spinner } from '../components/UI.jsx';

export default function Dashboard({ activeMonth }) {
  const [data, setData] = useState(null);
  const [fixos, setFixos] = useState([]);

  useEffect(() => {
    if (!activeMonth) return;
    Promise.all([
      api.get(`/financeiro/receitas?monthKey=${activeMonth}`),
      api.get(`/financeiro/gastos?monthKey=${activeMonth}`),
      api.get('/financeiro/fixos'),
    ]).then(([r, g, f]) => {
      setData({ receitas: r.data, gastos: g.data });
      setFixos(f.data);
    });
  }, [activeMonth]);

  if (!data) return <Spinner />;

  const totalRec  = data.receitas.reduce((s, r) => s + r.valor, 0);
  const totalGas  = data.gastos.reduce((s, g) => s + g.valor, 0);
  const saldo     = totalRec - totalGas;
  const totalFixos = fixos.reduce((s, f) => s + f.valor, 0);

  const catTotals = {};
  data.gastos.forEach(g => { catTotals[g.categoria] = (catTotals[g.categoria] || 0) + g.valor; });
  const maxCat = Math.max(...Object.values(catTotals), 1);
  const catSorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  const recent = [...data.receitas.map(r => ({...r,_tipo:'receita'})), ...data.gastos.map(g => ({...g,_tipo:'gasto'}))]
    .sort((a,b) => b.data > a.data ? 1 : -1).slice(0, 6);

  return (
    <div className="page-content">
      <div className="cards-grid">
        <div className="card card-income">
          <div className="card-label">Receita do Mês</div>
          <div className="card-value">{fmt(totalRec)}</div>
          <div className="card-sub">{data.receitas.length} entrada(s)</div>
        </div>
        <div className="card card-expense">
          <div className="card-label">Total de Gastos</div>
          <div className="card-value">{fmt(totalGas)}</div>
          <div className="card-sub">{data.gastos.length} lançamento(s)</div>
        </div>
        <div className={`card card-balance ${saldo >= 0 ? 'positive' : 'negative'}`}>
          <div className="card-label">Saldo Final</div>
          <div className="card-value">{fmt(saldo)}</div>
          <div className="card-sub">{saldo >= 0 ? '🟢 Positivo' : '🔴 Negativo'}</div>
        </div>
        <div className="card card-fixed">
          <div className="card-label">Gastos Fixos</div>
          <div className="card-value">{fmt(totalFixos)}</div>
          <div className="card-sub">comprometido/mês</div>
        </div>
      </div>

      <div className="section-row">
        <section className="panel">
          <div className="panel-header"><h2>Gastos por Categoria</h2></div>
          {catSorted.length === 0 ? <p className="empty-state">Nenhum gasto lançado ainda.</p> :
            <div className="chart-area">
              {catSorted.map(([cat, val]) => {
                const c = CATS[cat] || CATS.outros;
                return (
                  <div key={cat} className="cat-row">
                    <div className="cat-label">{c.emoji} {c.label}</div>
                    <div className="cat-bar-wrap"><div className="cat-bar" style={{ width: `${val/maxCat*100}%`, background: c.color }} /></div>
                    <div className="cat-val">{fmt(val)}</div>
                  </div>
                );
              })}
            </div>
          }
        </section>

        <section className="panel">
          <div className="panel-header"><h2>Últimos Lançamentos</h2></div>
          {recent.length === 0 ? <p className="empty-state">Nenhum lançamento ainda.</p> :
            <div className="tx-list">
              {recent.map(item => {
                const isInc = item._tipo === 'receita';
                const isPar = item.tipo === 'parcelado';
                const c = CATS[item.categoria] || CATS.outros;
                const emoji = isInc ? (REC_TYPES[item.tipo] || '💰') : c.emoji;
                return (
                  <div key={item.id} className="tx-item">
                    <div className={`tx-icon ${isInc ? 'income' : isPar ? 'parcela' : 'expense'}`}>{emoji}</div>
                    <div className="tx-info">
                      <div className="tx-desc">{item.descricao}</div>
                      <div className="tx-meta">{fmtDate(item.data)} · {isInc ? item.tipo : c.label}</div>
                    </div>
                    <div className={`tx-amount ${isInc ? 'income' : isPar ? 'parcela' : 'expense'}`}>{isInc ? '+' : '-'} {fmt(item.valor)}</div>
                  </div>
                );
              })}
            </div>
          }
        </section>
      </div>

      <section className="panel">
        <div className="panel-header"><h2>Comprometimento do Orçamento</h2></div>
        {totalRec === 0 ? <p className="empty-state" style={{paddingTop:12}}>Registre sua receita para ver o comprometimento.</p> :
          catSorted.length === 0 ? <p className="empty-state" style={{paddingTop:12}}>Nenhum gasto lançado.</p> :
          <div className="budget-bars">
            {catSorted.slice(0, 5).map(([cat, val]) => {
              const c = CATS[cat] || CATS.outros;
              const pct = Math.min(val / totalRec * 100, 100);
              const clr = pct > 80 ? '#ff5c6c' : pct > 50 ? '#ffb547' : '#3ecf8e';
              return (
                <div key={cat}>
                  <div className="budget-header">
                    <span className="budget-name">{c.emoji} {c.label}</span>
                    <span className="budget-pct">{pct.toFixed(1)}% da receita</span>
                  </div>
                  <div className="budget-track"><div className="budget-fill" style={{ width: `${pct}%`, background: clr }} /></div>
                </div>
              );
            })}
          </div>
        }
      </section>
    </div>
  );
}
