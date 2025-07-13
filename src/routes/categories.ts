import { Hono } from "hono";
import db from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { jwt } from "hono/jwt";


type JwtPayload = {
  user_id: number;
  sub: string;
  email: string;
  exp: number;
};

export const categories = new Hono();

categories.use('*', authMiddleware);


categories.get('/', (c) => {
  const { user_id } = c.get('jwtPayload') as JwtPayload;

  const rows = db.prepare(
    `SELECT * FROM categories WHERE (user_id = ? AND is_del = ?) OR (is_default = ?)`
  ).all(user_id, 0, 1);

  return c.json(rows);
});


categories.post('/', async (c) => {
  const body = await c.req.json();
  const { id, category_name, category_icon, is_default } = body;
  const { user_id } = c.get('jwtPayload');

  try {
    const result = db.prepare(
      `INSERT INTO categories (id, user_id, category_name, category_icon, is_default)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, user_id, category_name, category_icon, is_default);

    return c.json({ success: true, result });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, error: 'Failed to insert category.' }, 500);
  }
});

categories.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { category_name, category_icon, is_default } = body;

  try {
    const result = db.prepare(
      `UPDATE categories
       SET category_name = ?, category_icon = ?, is_default = ?
       WHERE id = ?`
    ).run(category_name, category_icon, is_default, id);

    if (result.changes === 0) {
      return c.json({ success: false, error: 'Category not found.' }, 404);
    }

    return c.json({ success: true, result });
  } catch (error) {
    console.error('Update error:', error);
    return c.json({ success: false, error: 'Failed to update category.' }, 500);
  }
});

categories.delete('/:categories_id', async (c) => {
  const id = c.req.param('categories_id');

  try {
    const result = db.prepare(
      `UPDATE categories SET is_del = 1 WHERE id = ?`
    ).run(id);

    if (result.changes === 0) {
      return c.json({ success: false, message: 'No category found with that ID.' }, 404);
    }

    return c.json({ success: true, result });
  } catch (error) {
    console.error('Delete error:', error);
    return c.json({ success: false, message: 'Failed to delete category.' }, 500);
  }
  
});