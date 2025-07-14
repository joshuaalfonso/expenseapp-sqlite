import { Hono } from "hono";
import type { JWTPayload } from "jose";
import db from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { DeleteBudget, GetBudgets, PostBudget, PutBudget, SingleBudget } from "../controllers/budgetsController.js";


export const budgets = new Hono();

budgets.use('*', authMiddleware);

budgets.get('/', GetBudgets);

budgets.get('/:id', SingleBudget);

budgets.post('/', PostBudget);

budgets.put('/:id', PutBudget)

budgets.delete('/:id', DeleteBudget)

