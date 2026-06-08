import { useAuth } from '../context/AuthContext.jsx';
import { monthLabel, curMonthKey } from '../utils.js';

const NAV = [
  { page: 'dashboard',  label: 'Dashboard',     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { page: 'receitas',   label: 'Receitas',       icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
  { page: 'gastos',     label: 'Lançar Gasto',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg> },
  { page: 'parcelados', label: 'Parcelados',      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
  { page: 'fixos',      label: 'Gastos Fixos',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { page: 'historico',  label: 'Histórico',      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg> },
  { page: 'balanco',    label: 'Balanço Mensal', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { page: 'usuarios',   label: 'Usuários',       adminOnly: true, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
];

export default function Sidebar({ currentPage, onNavigate, activeMonth, months, onMonthChange }) {
  const { user, logout, isAdmin } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🔐</span>
          <div>
            <span className="logo-title">SingleVault</span>
            <span className="logo-sub">Gestão Financeira</span>
          </div>
        </div>
      </div>

      <nav className="nav">
        {NAV.filter(n => !n.adminOnly || isAdmin()).map(n => (
          <button
            key={n.page}
            className={`nav-item ${currentPage === n.page ? 'active' : ''}`}
            onClick={() => onNavigate(n.page)}
          >
            {n.icon}{n.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="month-selector">
          <label>Mês ativo</label>
          <select value={activeMonth} onChange={e => onMonthChange(e.target.value)}>
            {months.map(m => (
              <option key={m} value={m}>{m === activeMonth && !months.includes(m) ? `+ ${monthLabel(m)}` : monthLabel(m)}</option>
            ))}
          </select>
        </div>
        <div className="user-bar">
          <div className="user-avatar">{(user?.name || user?.username || 'U').charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <span>{user?.name || user?.username}</span>
            <span className={`role-badge ${user?.role === 'admin' ? 'role-admin' : 'role-usuario'}`}>
              {user?.role === 'admin' ? 'admin' : 'usuário'}
            </span>
          </div>
          <button className="logout-btn" onClick={logout} title="Sair">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
