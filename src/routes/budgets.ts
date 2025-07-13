import { Hono } from "hono";
import type { JWTPayload } from "jose";
import db from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";


export const budgets = new Hono();

budgets.use('*', authMiddleware);

budgets.get('/', (c) => {
  const { user_id } = c.get('jwtPayload') as JWTPayload;

  const rows = db.prepare(
    `
 SELECT 
      b.id,
      b.budget_name,
      b.budget_icon,
      b.amount AS budget_amount,
      COUNT(e.id) AS total_items,
      IFNULL(SUM(e.amount), 0) AS total_expense_amount,
      b.date_created
    FROM budgets b
    LEFT JOIN expenses e 
      ON e.budget_id = b.id 
    WHERE b.user_id = ? AND b.is_del = 0
    GROUP BY b.id
    `
  ).all(user_id);

  return c.json(rows);
});

budgets.get('/:id', (c) => {
  const budget_id = c.req.param('id');
  // const { user_id } = c.get('jwtPayload') as JWTPayload;

  try {
    const budget  = db.prepare(
    `
      SELECT 
        id,
        budget_name,
        budget_icon,
        amount AS budget_amount,
        date_created
      FROM budgets
      WHERE id = ? AND is_del = 0
    `
    ).get(budget_id);

    if (!budget) {
      return c.json({ success: false, message: 'Budget not found.' }, 404);
    }

    // Fetch expenses related to the budget
    const expenses = db.prepare(
      `
        SELECT 
          e.id,
          e.budget_id,
          e.category_id,
          e.date,
          c.category_icon,
          c.category_name,
          e.description,
          e.amount,
          e.date_created
        FROM 
          expenses e
        LEFT JOIN
          categories c 
        ON
          e.category_id = c.id
        WHERE budget_id = ? 
      `
    ).all(budget_id);

    return c.json({ data: { ...budget }, expenses });
  } 
  
  catch(error) {
    console.error(error);
    return c.json({ success: false, message: 'Failed to fetch budget detail.' }, 500);
  }

});

budgets.post('/', async (c) => {
  const body = await c.req.json();
  const { id, budget_name, budget_icon, amount } = body;
  const { user_id } = c.get('jwtPayload');

  try {
    const result = db.prepare(
      `INSERT INTO budgets (id, user_id, budget_name, budget_icon, amount)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, user_id, budget_name, budget_icon, amount);

    return c.json({ success: true, result });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: 'Failed to insert budget.' }, 500);
  }
});


budgets.put('/:id', async (c) => {

  const id = c.req.param('id');
  const body = await c.req.json();

  const { budget_name, budget_icon, amount } = body;

  try {
    const result = db.prepare(
      `
        UPDATE 
          budgets 
        SET 
          budget_name = ?, budget_icon = ?, amount = ?
        WHERE 
          id = ?
      `
    ).run(budget_name, budget_icon, amount, id);

    return c.json({ success: true, result });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: 'Failed to update budget.' }, 500);
  }

})


budgets.delete('/:id', async (c) => {
  const budget_id = c.req.param('id');

  try {

    db.prepare(
      `DELETE FROM expenses WHERE budget_id = ?`
    ).run(budget_id);

    const result = db.prepare(
      `DELETE FROM budgets WHERE id = ?`
    ).run(budget_id);

    if (result.changes === 0) {
      return c.json({ success: false, message: 'No budget found with that ID.' }, 404);
    }

    return c.json({ success: true, result });
  } catch (error) {
    console.error('Delete error:', error);
    return c.json({ success: false, message: 'Failed to delete budget.' }, 500);
  }
});