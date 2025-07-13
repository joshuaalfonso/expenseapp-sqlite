import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import db from "../db/index.js";
import { DeleteExpense, fetchExpensesPerUser, FetchPaginatedExpensesPerUser, PostExpense, PutExpense } from "../controllers/expensesController.js";


export const expenses = new Hono();

expenses.use('*', authMiddleware);

expenses.get('/', fetchExpensesPerUser);

expenses.get('/page/:page/sortBy/:sortByValue', FetchPaginatedExpensesPerUser)

expenses.post('/', PostExpense);

expenses.put('/:id', PutExpense);


expenses.delete('/:expense_id/:amount', DeleteExpense);