import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register({ onNavigateToLogin }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', username: '', password: '', password2: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handle = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.password2) { setError('As senhas não conferem.'); return; }
    if (form.password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    setLoading(true);
    try {
      await register(form.username, form.name, form.password);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const f = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">🔐</span>
          <div><span className="logo-title">SingleVault</span><span className="logo-sub">Gestão Financeira Pessoal</span></div>
        </div>
        <h2 className="auth-title">Criar nova conta</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handle}>
          <div className="form-group">
            <label>Nome completo</label>
            <input type="text" placeholder="Seu nome" value={form.name} onChange={f('name')} />
          </div>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label>Usuário</label>
            <input type="text" placeholder="Escolha um usuário" value={form.username} onChange={f('username')} autoComplete="username" />
          </div>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label>Senha</label>
            <div className="pass-wrap">
              <input type={showPass ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={form.password} onChange={f('password')} />
              <button type="button" className="pass-toggle" onClick={() => setShowPass(s => !s)}>{showPass ? '🙈' : '👁'}</button>
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label>Confirmar Senha</label>
            <div className="pass-wrap">
              <input type={showPass ? 'text' : 'password'} placeholder="Repita a senha" value={form.password2} onChange={f('password2')} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 22 }} disabled={loading}>
            {loading ? 'Criando...' : 'Criar Conta'}
          </button>
        </form>
        <p className="auth-switch">Já tem conta? <a href="#" onClick={e => { e.preventDefault(); onNavigateToLogin(); }}>Entrar</a></p>
      </div>
    </div>
  );
}
