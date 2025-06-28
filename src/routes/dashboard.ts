import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import db from "../db/index.js";


export const dashboard = new Hono();

dashboard.use('*', authMiddleware);


dashboard.get('/summary', async (c) => {
  const { user_id } = c.get('jwtPayload') as { user_id: number };
  const yearNow = new Date().getFullYear();

  const totalRow: any = db.prepare(`
    SELECT total_expense FROM user_totals WHERE user_id = ?
  `).get(user_id);

  const monthRow: any = db.prepare(`
    SELECT SUM(amount) AS month_expense
    FROM expenses
    WHERE amount > 0
      AND strftime('%m', date) = strftime('%m', CURRENT_DATE)
      AND strftime('%Y', date) = strftime('%Y', CURRENT_DATE)
      AND user_id = ?
  `).get(user_id);

  const categoryRows = db.prepare(`
    SELECT 
      category_id, categories.category_name, SUM(amount) AS total
    FROM 
      expenses
    LEFT JOIN 
      categories ON expenses.category_id = categories.id
    WHERE 
      expenses.user_id = ?
      AND strftime('%Y', date) = strftime('%Y', CURRENT_DATE)
    GROUP BY 
      category_id
    ORDER BY 
      total DESC
    LIMIT 5
  `).all(user_id);

  const monthsExpense = db.prepare(`
    SELECT
      m.month_number,
      m.month_name,
      IFNULL(u.total, 0) AS total
    FROM (
      SELECT 1 AS month_number, 'January' AS month_name UNION
      SELECT 2, 'February' UNION
      SELECT 3, 'March' UNION
      SELECT 4, 'April' UNION
      SELECT 5, 'May' UNION
      SELECT 6, 'June' UNION
      SELECT 7, 'July' UNION
      SELECT 8, 'August' UNION
      SELECT 9, 'September' UNION
      SELECT 10, 'October' UNION
      SELECT 11, 'November' UNION
      SELECT 12, 'December'
    ) AS m
    LEFT JOIN monthly_totals u
      ON u.month = m.month_number AND u.user_id = ? AND u.year = ?
    ORDER BY m.month_number
  `).all(user_id, yearNow);

  const avgRow: any = db.prepare(`
    SELECT AVG(total) AS average_monthly
    FROM monthly_totals
    WHERE user_id = ? AND year = ?
  `).get(user_id, yearNow);

  return c.json({
    totalExpense: totalRow?.total_expense ?? 0,
    monthExpense: monthRow?.month_expense ?? 0,
    topCategories: categoryRows,
    monthsExpense: monthsExpense,
    averagePerMonth: avgRow?.average_monthly ?? 0,
  });
});