import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getDb, persist } from '../db.js';

const db = await getDb();
const exists = db.exec(`SELECT id FROM users WHERE username='admin'`);
if (!exists.length || !exists[0].values.length) {
  const hashed = await bcrypt.hash('Xk9mR4bW2nL7qT5j', 10);
  db.run(`INSERT INTO users VALUES ('${uuid()}','admin','Administrador','${hashed}','admin','ativo','${new Date().toISOString()}')`);
  persist();
  console.log('Admin criado: admin / Xk9mR4bW2nL7qT5j');
} else {
  console.log('Admin já existe.');
}
