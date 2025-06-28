import { Hono } from 'hono';
import db from '../db/index.js';


export const users = new Hono();

users.get('/', (c) => {
  const stmt = db.prepare('SELECT * FROM users')
  const users = stmt.all()
  return c.json(users)
})

users.post('/', async (c) => {
  const { name, email } = await c.req.json()
  const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
  const info = stmt.run(name, email)
  return c.json({ id: info.lastInsertRowid, name, email })
})


