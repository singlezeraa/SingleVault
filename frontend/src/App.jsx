import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider, useToast } from './components/UI.jsx';
import Sidebar from './components/Sidebar.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Receitas from './pages/Receitas.jsx';
import Gastos from './pages/Gastos.jsx';
import { Fixos, Parcelados, Historico, Balanco, Usuarios } from './pages/OtherPages.jsx';
import api from './api/index.js';
import { curMonthKey, monthLabel, monthKey } from './utils.js';

const PAGE_NAMES = {
  dashboard: 'Dashboard', receitas: 'Receitas', gastos: 'Lançar Gastos',
  parcelados: 'Parcelados', fixos: 'Gastos Fixos', historico: 'Histórico',
  balanco: 'Balanço Mensal', usuarios: 'Gestão de Usuários',
};

function AppInner() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [authView, setAuthView] = useState('login');
  const [page, setPage] = useState('dashboard');
  const [activeMonth, setActiveMonth] = useState(curMonthKey());
  const [months, setMonths] = useState([curMonthKey()]);

  useEffect(() => {
    if (!user) return;
    api.get('/financeiro/receitas').then(r => {
      const keys = new Set([curMonthKey()]);
      r.data.forEach(x => keys.add(x.data.substring(0, 7)));
      api.get('/financeiro/gastos').then(g => {
        g.data.forEach(x => keys.add(x.data.substring(0, 7)));
        const sorted = [...keys].sort().reverse();
        // Add 2 future months
        const d = new Date();
        for (let i = 1; i <= 2; i++) {
          d.setMonth(d.getMonth() + 1);
          const k = monthKey(d.getFullYear(), d.getMonth() + 1);
          if (!sorted.includes(k)) sorted.unshift(k);
        }
        setMonths(sorted.sort().reverse());
      });
    });
  }, [user, page]);

  const handleMonthChange = async (mk) => {
    setActiveMonth(mk);
    try { await api.post(`/financeiro/auto-apply/${mk}`); } catch {}
  };

  const navigate = (p) => {
    if (p === 'usuarios' && !isAdmin()) return;
    setPage(p);
  };

  if (!user) {
    return authView === 'login'
      ? <Login onNavigateToRegister={() => setAuthView('register')} />
      : <Register onNavigateToLogin={() => setAuthView('login')} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':  return <Dashboard activeMonth={activeMonth} />;
      case 'receitas':   return <Receitas activeMonth={activeMonth} />;
      case 'gastos':     return <Gastos activeMonth={activeMonth} />;
      case 'parcelados': return <Parcelados activeMonth={activeMonth} />;
      case 'fixos':      return <Fixos activeMonth={activeMonth} />;
      case 'historico':  return <Historico />;
      case 'balanco':    return <Balanco activeMonth={activeMonth} />;
      case 'usuarios':   return isAdmin() ? <Usuarios currentUserId={user.id} /> : null;
      default:           return <Dashboard activeMonth={activeMonth} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={page}
        onNavigate={navigate}
        activeMonth={activeMonth}
        months={months}
        onMonthChange={handleMonthChange}
      />
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <h1>{PAGE_NAMES[page] || page}</h1>
            {page === 'dashboard' && <span className="page-sub">{monthLabel(activeMonth)}</span>}
          </div>
          <div className="topbar-right">
            <div className="month-badge">{monthLabel(activeMonth)}</div>
          </div>
        </header>
        {renderPage()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </AuthProvider>
  );
}
