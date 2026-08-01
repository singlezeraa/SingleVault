import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './components/UI.jsx';
import { Spinner } from './components/UI.jsx';
import Sidebar from './components/Sidebar.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Receitas from './pages/Receitas.jsx';
import Gastos from './pages/Gastos.jsx';
import { Fixos, Parcelados, Historico, Balanco, Usuarios } from './pages/OtherPages.jsx';
import { autoApply, getReceitas, getGastos } from './data.js';
import { curMonthKey, monthLabel, monthKey } from './utils.js';

const PAGE_NAMES = {
  dashboard: 'Dashboard', receitas: 'Receitas', gastos: 'Lançar Gastos',
  parcelados: 'Parcelados', fixos: 'Gastos Fixos', historico: 'Histórico',
  balanco: 'Balanço Mensal', usuarios: 'Gestão de Usuários',
};

function AppInner() {
  const { user, isAdmin, loading } = useAuth();
  const [authView, setAuthView] = useState('login');
  const [page, setPage] = useState('dashboard');
  const [activeMonth, setActiveMonth] = useState(curMonthKey());
  const [months, setMonths] = useState([curMonthKey()]);

  useEffect(() => {
    if (!user) return;
    // Aplica fixos e parcelados no mês atual ao logar
    autoApply(user.id, curMonthKey()).catch(() => {});

    // Monta lista de meses com dados
    Promise.all([getReceitas(), getGastos()]).then(([rec, gas]) => {
      const keys = new Set([curMonthKey()]);
      rec.forEach(x => keys.add(x.data.substring(0, 7)));
      gas.forEach(x => keys.add(x.data.substring(0, 7)));
      const sorted = [...keys];
      const d = new Date();
      for (let i = 1; i <= 2; i++) {
        d.setMonth(d.getMonth() + 1);
        keys.add(monthKey(d.getFullYear(), d.getMonth() + 1));
      }
      setMonths([...keys].sort().reverse());
    });
  }, [user, page]);

  const handleMonthChange = async (mk) => {
    setActiveMonth(mk);
    if (user) await autoApply(user.id, mk).catch(() => {});
  };

  const navigate = (p) => {
    if (p === 'usuarios' && !isAdmin()) return;
    setPage(p);
  };

  if (loading) return <div className="auth-screen"><Spinner /></div>;

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