import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getDb, persist } from '../db.js';

const db = await getDb();
const exists = db.exec(`SELECT id FROM users WHERE username='admin'`);
if (!exists.length || !exists[0].values.length) {
  const hashed = await bcrypt.hash('hqzjhjG8u3RWuY8t#7QP', 10);
  db.run(`INSERT INTO users VALUES ('${uuid()}','admin','Administrador','${hashed}','admin','ativo','${new Date().toISOString()}')`);
  persist();
  console.log('Admin criado. Verifique a senha no gerenciador de segredos do projeto.');
} else {
  console.log('Admin já existe.');
}
