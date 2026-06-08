import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../singlevault.db.bin');

let db = null;

export async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
    createTables(db);
    persist(db);
  }
  return db;
}

export function persist(database) {
  const data = (database || db).export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function createTables(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'usuario',
      status TEXT NOT NULL DEFAULT 'ativo',
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS receitas (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      data TEXT NOT NULL,
      tipo TEXT NOT NULL,
      obs TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS gastos (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      data TEXT NOT NULL,
      categoria TEXT NOT NULL,
      tipo TEXT NOT NULL,
      pagamento TEXT NOT NULL,
      obs TEXT DEFAULT '',
      fixoId TEXT,
      parceladoId TEXT,
      parcelNum INTEGER,
      monthKey TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS fixos (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      categoria TEXT NOT NULL,
      pagamento TEXT NOT NULL,
      dia INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS parcelados (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valorTotal REAL NOT NULL,
      valorParcela REAL NOT NULL,
      parcelas INTEGER NOT NULL,
      mesInicio TEXT NOT NULL,
      dia INTEGER NOT NULL,
      categoria TEXT NOT NULL,
      pagamento TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}
