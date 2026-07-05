import pg from 'pg';

const { Pool } = pg;

let pool = null;

export async function getDb() {
  if (pool) return pool;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway.internal')
      ? false
      : { rejectUnauthorized: false }
  });
  await createTables(pool);
  return pool;
}

export async function persist() {
  // No PostgreSQL não precisa persistir manualmente
}

async function createTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'usuario',
      status TEXT NOT NULL DEFAULT 'ativo',
      "createdAt" TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS receitas (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      data TEXT NOT NULL,
      tipo TEXT NOT NULL,
      obs TEXT DEFAULT '',
      "createdAt" TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gastos (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      data TEXT NOT NULL,
      categoria TEXT NOT NULL,
      tipo TEXT NOT NULL,
      pagamento TEXT NOT NULL,
      obs TEXT DEFAULT '',
      "fixoId" TEXT,
      "parceladoId" TEXT,
      "parcelNum" INTEGER,
      "monthKey" TEXT,
      "createdAt" TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS fixos (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      categoria TEXT NOT NULL,
      pagamento TEXT NOT NULL,
      dia INTEGER NOT NULL,
      "createdAt" TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS parcelados (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      descricao TEXT NOT NULL,
      "valorTotal" REAL NOT NULL,
      "valorParcela" REAL NOT NULL,
      parcelas INTEGER NOT NULL,
      "mesInicio" TEXT NOT NULL,
      dia INTEGER NOT NULL,
      categoria TEXT NOT NULL,
      pagamento TEXT NOT NULL,
      "createdAt" TEXT NOT NULL
    );
  `);
}