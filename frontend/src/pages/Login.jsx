import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login({ onNavigateToRegister }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handle = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.username, form.password);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">🔐</span>
          <div><span className="logo-title">SingleVault</span><span className="logo-sub">Gestão Financeira Pessoal</span></div>
        </div>
        <h2 className="auth-title">Entrar na sua conta</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handle}>
          <div className="form-group">
            <label>Usuário</label>
            <input type="text" placeholder="Digite seu usuário" value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))} autoComplete="username" />
          </div>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label>Senha</label>
            <div className="pass-wrap">
              <input type={showPass ? 'text' : 'password'} placeholder="Digite sua senha" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} autoComplete="current-password" />
              <button type="button" className="pass-toggle" onClick={() => setShowPass(s => !s)}>{showPass ? '🙈' : '👁'}</button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 22 }} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="auth-switch">Não tem conta? <a href="#" onClick={e => { e.preventDefault(); onNavigateToRegister(); }}>Criar conta</a></p>
      </div>
    </div>
  );
}
