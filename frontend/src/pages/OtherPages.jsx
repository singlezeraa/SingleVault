import { useEffect, useState } from 'react';
import api from '../api/index.js';
import { fmt, fmtDate, todayStr, CATS, curMonthKey, addMonths, monthLabel } from '../utils.js';
import { ConfirmModal, useToast } from '../components/UI.jsx';

// ─── FIXOS ───────────────────────────────────────────────────
export function Fixos({ activeMonth }) {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ descricao:'', valor:'', categoria:'moradia', pagamento:'debito', dia:'' });
  const [del, setDel] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/financeiro/fixos').then(r => setList(r.data));
  useEffect(() => { load(); }, []);

  const submit = async e => {
    e.preventDefault();
    if (!form.descricao || !form.valor || !form.dia) { toast('Preencha todos os campos.', 'error'); return; }
    setLoading(true);
    try {
      await api.post('/financeiro/fixos', { ...form, valor: parseFloat(form.valor), dia: parseInt(form.dia) });
      setForm({ descricao:'', valor:'', categoria:'moradia', pagamento:'debito', dia:'' });
      await load(); toast('Gasto fixo cadastrado!');
    } catch { toast('Erro ao cadastrar.', 'error'); } finally { setLoading(false); }
  };

  const doDelete = async () => {
    await api.delete(`/financeiro/fixos/${del}`); setDel(null); await load(); toast('Gasto fixo excluído.');
  };

  const reapply = async () => {
    await api.post(`/financeiro/fixos/apply/${activeMonth}`);
    toast('Fixos aplicados no mês atual!');
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const total = list.reduce((s, f) => s + f.valor, 0);

  return (
    <div className="page-content">
      <ConfirmModal open={!!del} title="Excluir Gasto Fixo" message="O fixo será removido. Lançamentos passados permanecem. Confirmar?" onConfirm={doDelete} onCancel={() => setDel(null)} />
      <section className="panel form-panel">
        <div className="panel-header"><h2>Cadastrar Gasto Fixo</h2><span className="panel-hint">Lançado automaticamente todo mês no dia indicado</span></div>
        <form className="form-grid" onSubmit={submit}>
          <div className="form-group"><label>Descrição</label><input value={form.descricao} onChange={f('descricao')} placeholder="Ex: Netflix, Aluguel..." required /></div>
          <div className="form-group"><label>Valor (R$)</label><input type="number" value={form.valor} onChange={f('valor')} placeholder="0,00" min="0" step="0.01" required /></div>
          <div className="form-group"><label>Categoria</label>
            <select value={form.categoria} onChange={f('categoria')}>
              {Object.entries(CATS).map(([k,c]) => <option key={k} value={k}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Dia de Vencimento</label><input type="number" value={form.dia} onChange={f('dia')} min="1" max="31" placeholder="Ex: 5" required /></div>
          <div className="form-group"><label>Forma de Pagamento</label>
            <select value={form.pagamento} onChange={f('pagamento')}>
              <option value="debito">Débito automático</option><option value="credito">Crédito</option>
              <option value="boleto">Boleto</option><option value="pix">PIX</option>
            </select>
          </div>
          <div className="form-full form-actions"><button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Cadastrar Fixo'}</button></div>
        </form>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>Gastos Fixos Cadastrados</h2>
          {list.length > 0 && <div className="total-badge">Total: {fmt(total)}/mês</div>}
        </div>
        {list.length === 0 ? <p className="empty-state">Nenhum gasto fixo cadastrado.</p> :
          <div className="tx-list">
            {list.map(f => {
              const c = CATS[f.categoria] || CATS.outros;
              return (
                <div key={f.id} className="tx-item">
                  <div className="tx-icon expense">{c.emoji}</div>
                  <div className="tx-info">
                    <div className="tx-desc">{f.descricao}</div>
                    <div className="tx-meta">{c.label} · Dia {f.dia} · {f.pagamento}</div>
                  </div>
                  <div className="tx-amount expense">{fmt(f.valor)}/mês</div>
                  <button className="tx-delete" onClick={() => setDel(f.id)}>✕</button>
                </div>
              );
            })}
          </div>
        }
        {list.length > 0 &&
          <div className="import-fixos-wrap">
            <button className="btn btn-secondary" onClick={reapply}>↓ Aplicar Fixos no Mês Atual</button>
          </div>
        }
      </section>
    </div>
  );
}

// ─── PARCELADOS ──────────────────────────────────────────────
export function Parcelados({ activeMonth }) {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [del, setDel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ descricao:'', valorTotal:'', parcelas:'2', data:todayStr(), categoria:'tecnologia', pagamento:'credito' });

  const load = async () => {
    const [p, g] = await Promise.all([api.get('/financeiro/parcelados'), api.get(`/financeiro/gastos?monthKey=${activeMonth}`)]);
    setList(p.data); setGastos(g.data);
  };
  useEffect(() => { load(); }, [activeMonth]);

  const totalMes = gastos.filter(g => g.tipo === 'parcelado').reduce((s, g) => s + g.valor, 0);
  const now = curMonthKey();

  const submit = async e => {
    e.preventDefault();
    if (!form.descricao || !form.valorTotal) { toast('Preencha todos os campos.', 'error'); return; }
    setLoading(true);
    const [y, mo, dia] = form.data.split('-');
    try {
      await api.post('/financeiro/parcelados', {
        descricao: form.descricao, valorTotal: parseFloat(form.valorTotal),
        parcelas: parseInt(form.parcelas), mesInicio: `${y}-${mo}`, dia: parseInt(dia),
        categoria: form.categoria, pagamento: form.pagamento
      });
      setForm({ descricao:'', valorTotal:'', parcelas:'2', data:todayStr(), categoria:'tecnologia', pagamento:'credito' });
      await load(); toast(`Parcelamento cadastrado!`);
    } catch { toast('Erro ao cadastrar.', 'error'); } finally { setLoading(false); }
  };

  const doDelete = async () => {
    await api.delete(`/financeiro/parcelados/${del}`); setDel(null); await load(); toast('Parcelamento excluído.');
  };

  const calcPago = (p) => { let c=0; for(let i=0;i<p.parcelas;i++){if(addMonths(p.mesInicio,i)<=now) c++;} return c; };
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const vt = parseFloat(form.valorTotal) || 0;
  const np = parseInt(form.parcelas) || 1;

  return (
    <div className="page-content">
      <ConfirmModal open={!!del} title="Excluir Parcelamento" message="Parcelas futuras serão removidas. As já passadas permanecem. Confirmar?" onConfirm={doDelete} onCancel={() => setDel(null)} />
      <section className="panel form-panel">
        <div className="panel-header"><h2>Cadastrar Gasto Parcelado</h2><span className="panel-hint">A parcela é lançada automaticamente a cada mês</span></div>
        <form className="form-grid" onSubmit={submit}>
          <div className="form-group"><label>Descrição</label><input value={form.descricao} onChange={f('descricao')} placeholder="Ex: TV Samsung, Notebook..." required /></div>
          <div className="form-group"><label>Valor Total (R$)</label><input type="number" value={form.valorTotal} onChange={f('valorTotal')} placeholder="0,00" min="0" step="0.01" required /></div>
          <div className="form-group"><label>Parcelas</label>
            <select value={form.parcelas} onChange={f('parcelas')}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x{n===1?' (à vista)':''}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Data da 1ª Parcela</label><input type="date" value={form.data} onChange={f('data')} required /></div>
          <div className="form-group"><label>Categoria</label>
            <select value={form.categoria} onChange={f('categoria')}>
              {Object.entries(CATS).map(([k,c]) => <option key={k} value={k}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Pagamento</label>
            <select value={form.pagamento} onChange={f('pagamento')}>
              <option value="credito">Crédito</option><option value="debito">Débito</option><option value="boleto">Boleto</option>
            </select>
          </div>
          {vt > 0 &&
            <div className="form-group form-full">
              <div className="par-preview"><strong>{np}x</strong> de <strong>{fmt(vt/np)}</strong> · Total: <strong>{fmt(vt)}</strong></div>
            </div>
          }
          <div className="form-full form-actions"><button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Cadastrar Parcelado'}</button></div>
        </form>
      </section>
      <section className="panel">
        <div className="panel-header"><h2>Parcelamentos Ativos</h2><div className="total-badge">{fmt(totalMes)}/mês</div></div>
        {list.length === 0 ? <p className="empty-state">Nenhum parcelamento cadastrado.</p> :
          <div className="tx-list">
            {list.map(p => {
              const c = CATS[p.categoria] || CATS.outros;
              const mesF = addMonths(p.mesInicio, p.parcelas - 1);
              const pago = calcPago(p);
              const ativa = now >= p.mesInicio && now <= mesF;
              return (
                <div key={p.id} className="tx-item">
                  <div className="tx-icon parcela">{c.emoji}</div>
                  <div className="tx-info">
                    <div className="tx-desc">{p.descricao}</div>
                    <div className="tx-meta">{c.label} · {p.pagamento} · {fmt(p.valorParcela)}/mês · Até {monthLabel(mesF)}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0}}>
                    <span className="parc-progress">{pago}/{p.parcelas}</span>
                    <span style={{fontSize:11,color:'var(--text3)'}}>{ativa ? `${p.parcelas-pago} restante(s)` : 'Encerrado'}</span>
                  </div>
                  <button className="tx-delete" onClick={() => setDel(p.id)}>✕</button>
                </div>
              );
            })}
          </div>
        }
      </section>
    </div>
  );
}

// ─── HISTÓRICO ───────────────────────────────────────────────
export function Historico() {
  const [months, setMonths] = useState({});
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/financeiro/receitas'),
      api.get('/financeiro/gastos'),
    ]).then(([r, g]) => {
      const m = {};
      r.data.forEach(x => { const k = x.data.substring(0,7); if(!m[k]) m[k]={receitas:[],gastos:[]}; m[k].receitas.push(x); });
      g.data.forEach(x => { const k = x.data.substring(0,7); if(!m[k]) m[k]={receitas:[],gastos:[]}; m[k].gastos.push(x); });
      setMonths(m);
    }).finally(() => setLoading(false));
  }, []);

  const keys = Object.keys(months).sort().reverse();

  return (
    <div className="page-content">
      <section className="panel">
        <div className="panel-header"><h2>Histórico de Meses</h2></div>
        {loading ? <p className="empty-state">Carregando...</p> : keys.length === 0 ? <p className="empty-state">Nenhum dado histórico ainda.</p> :
          <div className="historico-grid">
            {keys.map(key => {
              const m = months[key];
              const rec = m.receitas.reduce((s,r)=>s+r.valor,0);
              const gas = m.gastos.reduce((s,g)=>s+g.valor,0);
              const sal = rec - gas;
              return (
                <div key={key} className="hist-card" onClick={() => setDetail(detail===key?null:key)}>
                  <div className="hist-month">{monthLabel(key)}</div>
                  <div className={`hist-val ${sal>=0?'pos':'neg'}`}>{sal>=0?'▲':'▼'} {fmt(Math.abs(sal))}</div>
                  <div className="hist-sub">Entrada: {fmt(rec)} · Saída: {fmt(gas)}</div>
                </div>
              );
            })}
          </div>
        }
      </section>
      {detail && months[detail] && (() => {
        const m = months[detail];
        const rec = m.receitas.reduce((s,r)=>s+r.valor,0);
        const gas = m.gastos.reduce((s,g)=>s+g.valor,0);
        const sal = rec - gas;
        return (
          <section className="panel">
            <div className="panel-header"><h2>Detalhes — {monthLabel(detail)}</h2><button className="btn-icon" onClick={()=>setDetail(null)}>✕</button></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
              <div className="card card-income" style={{margin:0}}><div className="card-label">Receitas</div><div className="card-value">{fmt(rec)}</div></div>
              <div className="card card-expense" style={{margin:0}}><div className="card-label">Gastos</div><div className="card-value">{fmt(gas)}</div></div>
              <div className={`card card-balance ${sal>=0?'positive':'negative'}`} style={{margin:0}}><div className="card-label">Saldo</div><div className="card-value">{fmt(sal)}</div></div>
            </div>
          </section>
        );
      })()}
    </div>
  );
}

// ─── BALANÇO ─────────────────────────────────────────────────
export function Balanco({ activeMonth }) {
  const toast = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!activeMonth) return;
    Promise.all([
      api.get(`/financeiro/receitas?monthKey=${activeMonth}`),
      api.get(`/financeiro/gastos?monthKey=${activeMonth}`),
    ]).then(([r, g]) => setData({ receitas: r.data, gastos: g.data }));
  }, [activeMonth]);

  if (!data) return <p className="empty-state" style={{padding:40}}>Carregando...</p>;

  const rec = data.receitas.reduce((s,r)=>s+r.valor,0);
  const gas = data.gastos.reduce((s,g)=>s+g.valor,0);
  const sal = rec - gas;

  const catTotals = {};
  data.gastos.forEach(g => { catTotals[g.categoria] = (catTotals[g.categoria]||0) + g.valor; });
  const maxCat = Math.max(...Object.values(catTotals), 1);

  const exportCSV = () => {
    const rows = [
      ['Tipo','Data','Descrição','Categoria','Valor','Pagamento','Obs'],
      ...data.receitas.map(r => ['Receita',r.data,r.descricao,r.tipo,r.valor.toFixed(2),'',r.obs||'']),
      ...data.gastos.map(g   => ['Gasto',  g.data,g.descricao,g.categoria,g.valor.toFixed(2),g.pagamento,g.obs||'']),
    ];
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'),{href:url,download:`singlevault-${activeMonth}.csv`}).click();
    URL.revokeObjectURL(url);
    toast('CSV exportado!');
  };

  return (
    <div className="page-content">
      <div className="balanco-header">
        <h2>Balanço — {monthLabel(activeMonth)}</h2>
        <button className="btn btn-outline" onClick={exportCSV}>Exportar CSV</button>
      </div>
      <div className="cards-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <div className="card card-income"><div className="card-label">Total de Entradas</div><div className="card-value">{fmt(rec)}</div></div>
        <div className="card card-expense"><div className="card-label">Total de Saídas</div><div className="card-value">{fmt(gas)}</div></div>
        <div className={`card card-balance ${sal>=0?'positive':'negative'}`}><div className="card-label">Saldo Final</div><div className="card-value">{fmt(sal)}</div></div>
      </div>
      <div className="section-row">
        <section className="panel">
          <div className="panel-header"><h2>Gastos por Categoria</h2></div>
          {Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat,val]) => {
            const c = CATS[cat] || CATS.outros;
            return <div key={cat} className="cat-row"><div className="cat-label">{c.emoji} {c.label}</div><div className="cat-bar-wrap"><div className="cat-bar" style={{width:`${val/maxCat*100}%`,background:c.color}}/></div><div className="cat-val">{fmt(val)}</div></div>;
          })}
        </section>
        <section className="panel">
          <div className="panel-header"><h2>Resumo de Receitas</h2></div>
          {data.receitas.length === 0 ? <p className="empty-state">Sem receitas.</p> :
            <div className="tx-list">{data.receitas.map(r=><div key={r.id} className="tx-item"><div className="tx-icon income">💰</div><div className="tx-info"><div className="tx-desc">{r.descricao}</div><div className="tx-meta">{fmtDate(r.data)} · {r.tipo}</div></div><div className="tx-amount income">+ {fmt(r.valor)}</div></div>)}</div>
          }
        </section>
      </div>
    </div>
  );
}

// ─── USUÁRIOS ────────────────────────────────────────────────
export function Usuarios({ currentUserId }) {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [del, setDel] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [form, setForm] = useState({ nome:'', username:'', password:'', role:'usuario' });
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/users').then(r => setList(r.data));
  useEffect(() => { load(); }, []);

  const submit = async e => {
    e.preventDefault();
    if (!form.nome||!form.username||!form.password){toast('Preencha todos os campos.','error');return;}
    setLoading(true);
    try {
      await api.post('/users',{name:form.nome,username:form.username,password:form.password,role:form.role});
      setForm({nome:'',username:'',password:'',role:'usuario'}); await load(); toast(`Usuário "${form.username}" criado!`);
    } catch(err){toast(err.response?.data?.error||'Erro ao criar.','error');}
    finally{setLoading(false);}
  };

  const doDelete = async () => {
    await api.delete(`/users/${del}`); setDel(null); await load(); toast('Usuário excluído.');
  };

  const openEdit = u => { setEditUser(u.id); setEditForm({name:u.name,password:'',role:u.role,status:u.status}); };
  const saveEdit = async () => {
    try { await api.put(`/users/${editUser}`,editForm); setEditUser(null); await load(); toast('Usuário atualizado!'); }
    catch(err){toast(err.response?.data?.error||'Erro.','error');}
  };

  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const ef = k => e => setEditForm(p=>({...p,[k]:e.target.value}));

  return (
    <div className="page-content">
      <ConfirmModal open={!!del} title="Excluir Usuário" message="Tem certeza? Esta ação não pode ser desfeita." onConfirm={doDelete} onCancel={()=>setDel(null)} />

      {editUser && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEditUser(null)}>
          <div className="modal" style={{minWidth:360}}>
            <h3>Editar Usuário</h3>
            <div className="form-group" style={{marginTop:16}}><label>Nome completo</label><input value={editForm.name} onChange={ef('name')} /></div>
            <div className="form-group" style={{marginTop:12}}><label>Nova senha <span style={{color:'var(--text3)',fontWeight:400}}>(deixe em branco para não alterar)</span></label><input type="password" value={editForm.password} onChange={ef('password')} placeholder="Nova senha..." /></div>
            {editUser !== currentUserId && <>
              <div className="form-group" style={{marginTop:12}}><label>Cargo</label><select value={editForm.role} onChange={ef('role')}><option value="usuario">👤 Usuário</option><option value="admin">🛡️ Administrador</option></select></div>
              <div className="form-group" style={{marginTop:12}}><label>Status</label><select value={editForm.status} onChange={ef('status')}><option value="ativo">✅ Ativo</option><option value="inativo">🚫 Inativo</option></select></div>
            </>}
            <div className="modal-actions"><button className="btn btn-outline" onClick={()=>setEditUser(null)}>Cancelar</button><button className="btn btn-primary" onClick={saveEdit}>Salvar</button></div>
          </div>
        </div>
      )}

      <section className="panel form-panel">
        <div className="panel-header"><h2>Adicionar Usuário</h2><span className="panel-hint">Somente administradores podem gerenciar usuários</span></div>
        <form className="form-grid" onSubmit={submit}>
          <div className="form-group"><label>Nome completo</label><input value={form.nome} onChange={f('nome')} placeholder="Nome do usuário" required /></div>
          <div className="form-group"><label>Usuário (login)</label><input value={form.username} onChange={f('username')} placeholder="nome_de_usuario" required /></div>
          <div className="form-group"><label>Senha</label><input type="password" value={form.password} onChange={f('password')} placeholder="Mínimo 6 caracteres" required /></div>
          <div className="form-group"><label>Cargo</label><select value={form.role} onChange={f('role')}><option value="usuario">👤 Usuário</option><option value="admin">🛡️ Administrador</option></select></div>
          <div className="form-full form-actions"><button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Criando...':'Adicionar Usuário'}</button></div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Usuários Cadastrados</h2><div className="total-badge">{list.length} usuário(s)</div></div>
        <table className="user-table">
          <thead><tr><th>Usuário</th><th>Cargo</th><th>Status</th><th>Criado em</th><th>Ações</th></tr></thead>
          <tbody>
            {list.map(u => {
              const isMe = u.id === currentUserId;
              return (
                <tr key={u.id}>
                  <td>
                    <div className="user-name-cell">
                      <div className={`user-mini-avatar ${u.role==='admin'?'av-admin':'av-usuario'}`}>{(u.name||u.username).charAt(0).toUpperCase()}</div>
                      <div><div className="user-full-name">{u.name||'—'}{isMe&&<span className="you-badge">você</span>}</div><div className="user-username">@{u.username}</div></div>
                    </div>
                  </td>
                  <td><span className={`role-badge ${u.role==='admin'?'role-admin':'role-usuario'}`}>{u.role==='admin'?'🛡️ Admin':'👤 Usuário'}</span></td>
                  <td><span className={`status-dot ${u.status||'ativo'}`}></span>{u.status==='inativo'?'Inativo':'Ativo'}</td>
                  <td style={{fontSize:12,color:'var(--text2)'}}>{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <div className="user-actions">
                      <button className="btn btn-outline btn-sm" onClick={()=>openEdit(u)}>Editar</button>
                      {!isMe && <button className="btn btn-danger btn-sm" onClick={()=>setDel(u.id)}>Excluir</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
