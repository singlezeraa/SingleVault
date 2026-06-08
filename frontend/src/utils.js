export const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
export const fmtDate = str => { if (!str) return ''; const [y, m, d] = str.split('-'); return `${d}/${m}/${y}`; };
export const monthKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
export const monthLabel = key => { const [y, m] = key.split('-'); return `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][+m-1]}/${y}`; };
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const curMonthKey = () => { const d = new Date(); return monthKey(d.getFullYear(), d.getMonth()+1); };
export const addMonths = (key, n) => { let [y, m] = key.split('-').map(Number); m += n; while(m > 12){ m -= 12; y++; } return monthKey(y, m); };

export const CATS = {
  alimentacao: { emoji: '🍔', label: 'Alimentação', color: '#ff8c42' },
  moradia:     { emoji: '🏠', label: 'Moradia',     color: '#6c8fff' },
  transporte:  { emoji: '🚗', label: 'Transporte',  color: '#ffb547' },
  saude:       { emoji: '❤️', label: 'Saúde',        color: '#ff5c6c' },
  educacao:    { emoji: '📚', label: 'Educação',     color: '#3ecf8e' },
  lazer:       { emoji: '🎮', label: 'Lazer',        color: '#a78bfa' },
  vestuario:   { emoji: '👕', label: 'Vestuário',    color: '#f472b6' },
  tecnologia:  { emoji: '💻', label: 'Tecnologia',   color: '#38bdf8' },
  servicos:    { emoji: '🔧', label: 'Serviços',     color: '#94a3b8' },
  outros:      { emoji: '📦', label: 'Outros',       color: '#64748b' },
};

export const REC_TYPES = { salario: '💼', freelance: '🧑‍💻', investimento: '📈', bonus: '🎁', outro: '💰' };
