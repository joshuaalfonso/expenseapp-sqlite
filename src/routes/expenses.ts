import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import db from "../db/index.js";


export const expenses = new Hono();

expenses.use('*', authMiddleware);


expenses.get('/', (c) => {
  const { user_id } = c.get('jwtPayload') as { user_id: number };

  const rows = db.prepare(`
    SELECT 
      e.id,
      e.date,
      c.id AS category_id,
      c.category_name,
      c.category_icon,
      e.amount,
      e.description,
      u.id AS user_id,
      u.name,
      u.email,
      u.picture
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    LEFT JOIN users u ON e.user_id = u.id
    WHERE e.user_id = ?
  `).all(user_id);

  return c.json(rows);
});


expenses.get('/page/:page/sortBy/:sortByValue', async (c) => {

    const page = parseInt(c.req.param('page') || '1');

    const sortBy = c.req.param('sortByValue')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { user_id } = c.get('jwtPayload');

    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const rows = db.prepare(`
        SELECT 
            e.id,
            e.date,
            c.id AS category_id,
            c.category_name,
            c.category_icon,
            e.amount,
            e.description,
            u.id AS user_id,
            u.name,
            u.email,
            u.picture
        FROM 
            expenses AS e
        LEFT JOIN
            categories AS c ON e.category_id = c.id
        LEFT JOIN
            users AS u ON e.user_id = u.id
        WHERE 
            e.user_id = ?
        ORDER BY 
            e.date ${sortBy}
        LIMIT ? OFFSET ?
        `).all(user_id, limit, offset);

        const totalRow: any = db.prepare(
            `
                SELECT 
                    COUNT(*) AS total 
                FROM 
                    expenses 
                WHERE 
                    user_id = ?
            `
        ).get(user_id);

        const total = totalRow.total;

        return c.json({
        data: rows,
        currentPage: page,
        perPage: limit,
        total,
        totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error(error);
        return c.json({ message: 'Failed to fetch data' }, 500);
    }
});


expenses.post('/', async (c) => {
    const body = await c.req.json();
    const { user_id } = c.get('jwtPayload');
    const { id, date, category_id, amount, description } = body;

    const year = new Date(date).getFullYear();
    const month = new Date(date).getMonth() + 1;

    try {
        const insertExpense = db.prepare(`
            INSERT INTO expenses (id, date, category_id, amount, description, user_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const updateUserTotal = db.prepare(`
            UPDATE user_totals 
            SET total_expense = total_expense + ? 
            WHERE user_id = ?
        `);

        const upsertMonthlyTotal = db.prepare(`
            INSERT INTO monthly_totals (user_id, year, month, total)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, year, month)
            DO UPDATE SET total = total + excluded.total
        `);

        // Wrap it in a transaction
        const transaction = db.transaction(() => {
            insertExpense.run(id, date, category_id, amount, description, user_id);
            updateUserTotal.run(amount, user_id);
            upsertMonthlyTotal.run(user_id, year, month, amount);
        });

        transaction();

        return c.json({ success: true });
    } catch (error) {
        console.error(error);
        return c.json({ success: false, error: 'Failed to insert expense.' }, 500);
    }
});


expenses.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { user_id } = c.get('jwtPayload');

    const {
        date: newDate,
        category_id: newCategoryId,
        amount: newAmount,
        description: newDescription
    } = body;

    try {
        const getExpenseStmt = db.prepare(
        `SELECT amount, date FROM expenses WHERE id = ? AND user_id = ?`
        );

        const existing: any = getExpenseStmt.get(id, user_id);

        if (!existing) {
        return c.json({ success: false, message: 'Expense not found' }, 404);
        }

        const { amount: oldAmount, date: oldDate } = existing;

        const oldYear = new Date(oldDate).getFullYear();
        const oldMonth = new Date(oldDate).getMonth() + 1;
        const newYear = new Date(newDate).getFullYear();
        const newMonth = new Date(newDate).getMonth() + 1;

        const updateExpense = db.prepare(`
            UPDATE expenses
            SET date = ?, category_id = ?, amount = ?, description = ?
            WHERE id = ?
        `);

        const subtractOldMonthly = db.prepare(`
            UPDATE monthly_totals SET total = total - ? 
            WHERE user_id = ? AND year = ? AND month = ?
        `);

        const deleteZeroMonthly = db.prepare(`
            DELETE FROM monthly_totals 
            WHERE user_id = ? AND year = ? AND month = ? AND total <= 0
        `);

        const upsertNewMonthly = db.prepare(`
            INSERT INTO monthly_totals (user_id, year, month, total)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, year, month)
            DO UPDATE SET total = total + excluded.total
        `);

        const updateUserTotal = db.prepare(`
            UPDATE user_totals SET total_expense = total_expense - ? + ? 
            WHERE user_id = ?
        `);

        // Wrap everything in a transaction
        const transaction = db.transaction(() => {
            subtractOldMonthly.run(oldAmount, user_id, oldYear, oldMonth);
            deleteZeroMonthly.run(user_id, oldYear, oldMonth);
            upsertNewMonthly.run(user_id, newYear, newMonth, newAmount);
            updateExpense.run(newDate, newCategoryId, newAmount, newDescription, id);
            updateUserTotal.run(oldAmount, newAmount, user_id);
        });

        transaction();

        return c.json({ success: true, message: 'Successfully updated!' });

    } catch (error) {
        console.error('Update error:', error);
        return c.json({ success: false, error: 'Failed to update expense.' }, 500);
    }
});


expenses.delete('/:expense_id/:amount', async (c) => {
    const id = c.req.param('expense_id');
    const amount = parseFloat(c.req.param('amount'));  // Ensure it's a number
    const { user_id } = c.get('jwtPayload');

    try {
        const getExpense = db.prepare(`
            SELECT amount, date FROM expenses WHERE id = ? AND user_id = ?
        `);

        const expense: any = getExpense.get(id, user_id);

        if (!expense) {
            return c.json({ success: false, message: 'Expense not found' }, 404);
        }

        const { date } = expense;
        const year = new Date(date).getFullYear();
        const month = new Date(date).getMonth() + 1;

        const updateMonthly = db.prepare(`
            UPDATE monthly_totals 
            SET total = total - ? 
            WHERE user_id = ? AND year = ? AND month = ?
        `);

        const deleteEmptyMonthly = db.prepare(`
            DELETE FROM monthly_totals 
            WHERE user_id = ? AND year = ? AND month = ? AND total <= 0
        `);

        const deleteExpense = db.prepare(`
            DELETE FROM expenses WHERE id = ?
        `);

        const updateUserTotal = db.prepare(`
            UPDATE user_totals 
            SET total_expense = total_expense - ? 
            WHERE user_id = ?
        `);

        const transaction = db.transaction(() => {
            updateMonthly.run(amount, user_id, year, month);
            deleteEmptyMonthly.run(user_id, year, month);

            const result = deleteExpense.run(id);
            if (result.changes === 0) {
                throw new Error('Expense not found during delete');
            }

            updateUserTotal.run(amount, user_id);
        });

        transaction();

        return c.json({ success: true, message: 'Successfully deleted!' });

    } catch (error) {
        console.error('Delete error:', error);
        return c.json({ success: false, message: 'Failed to delete expense.' }, 500);
    }
});
