import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import db from './db/index.js'
import { users } from './routes/users.js'
import { authGoogle } from './routes/authGoogle.js'
import { cors } from 'hono/cors'
import { categories } from './routes/categories.js'
import { dashboard } from './routes/dashboard.js'
import { expenses } from './routes/expenses.js'

const app = new Hono();
app.use('*', cors());

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/users', users);

app.route('/auth/google', authGoogle);

app.route('/dashboard', dashboard);

app.route('/categories', categories);

app.route('/expenses', expenses);


serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
