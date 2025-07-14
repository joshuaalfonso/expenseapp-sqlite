import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import db from "../db/index.js";
import { GetSummaryReport } from "../controllers/dashboardController.js";


export const dashboard = new Hono();

dashboard.use('*', authMiddleware);

dashboard.get('summary', GetSummaryReport);

