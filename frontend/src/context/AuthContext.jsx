import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica sessão ativa ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadProfile(session.user);
      else setLoading(false);
    });

    // Escuta mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) loadProfile(session.user);
      else { setUser(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(authUser) {
    const { data: perfil } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (perfil) {
      setUser({
        id: authUser.id,
        email: authUser.email,
        username: perfil.username,
        name: perfil.name,
        role: perfil.role,
        status: perfil.status,
      });
    }
    setLoading(false);
  }

  const login = async (username, password) => {
    // Busca o email pelo username
    const { data: perfil } = await supabase
      .from('perfis')
      .select('id')
      .eq('username', username)
      .single();

    if (!perfil) throw new Error('Usuário ou senha incorretos.');

    // O Supabase Auth usa email, então usamos username@singlevault.local
    const email = `${username}@singlevault.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Usuário ou senha incorretos.');
  };

  const register = async (username, name, password) => {
    // Verifica se o username já existe
    const { data: existe } = await supabase
      .from('perfis')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existe) throw new Error('Este usuário já existe.');

    const email = `${username}@singlevault.local`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, name } }
    });

    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const isAdmin = () => user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);