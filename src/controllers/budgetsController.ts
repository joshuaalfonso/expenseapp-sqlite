import type { Context } from "hono";
import db from "../db/index.js";
import { AllBudgetsPerUser, BudgetDetails, DeleteBudgetById, GetExpensesByBudget, InsertBudget, UpdateBudget } from "../models/budgetsModel.js";
import { SubtractOldMonthly } from "../models/monthlyTotalsModel.js";
import { AllExpensesByBudget, DeleteEmptyMonthly, DeleteExpenseById } from "../models/expensesModel.js";
import { SubtractUserTotal } from "../models/userTotalsModel.js";
import type { JWTPayload } from "jose";
import { DeleteZeroCategory, SubtractOldCategory } from "../models/categoryTotalsModel.js";



export const GetBudgets = async (c: Context) => {

    const { user_id } = c.get('jwtPayload') as JWTPayload;

    try {
        const rows = AllBudgetsPerUser().all(user_id);

        return c.json(rows)
    }

    catch (error) {
        console.error('Error fetching budgets:', error);
        return c.json({ error: 'Failed to fetch budget data' }, 500);
    }

}


export const SingleBudget = async (c: Context) => {

    const budget_id = c.req.param('id');

    try {
        const budget = BudgetDetails().get(budget_id);

        if (!budget) {
            return c.json({ success: false, message: 'Budget not found.' }, 404);
        }

        const expensesByBudget = AllExpensesByBudget().all(budget_id)

        return c.json({ data: { ...budget }, expenses: expensesByBudget });
    }

    catch(error) {
        console.error(error);
        return c.json({ success: false, message: 'Failed to fetch budget details.' }, 500);
    }
}


export const PostBudget = async (c: Context) => {

    const body = await c.req.json();
    const { id, budget_name, budget_icon, amount } = body;
    const { user_id } = c.get('jwtPayload');

    try {
        const result = InsertBudget().run(id, user_id, budget_name, budget_icon, amount);

        return c.json({ success: true, result });
    } catch (error) {
        console.error(error);
        return c.json({ success: false, message: 'Failed to insert budget.' }, 500);
    }
}


export const PutBudget = async (c: Context) => {

    const id = c.req.param('id');
    const body = await c.req.json();

    const { budget_name, budget_icon, amount } = body;

    try {
        const result = UpdateBudget().run(budget_name, budget_icon, amount, id);

        return c.json({ success: true, result });
    } catch (error) {
        console.error(error);
        return c.json({ success: false, message: 'Failed to update budget.' }, 500);
    }

}


export const DeleteBudget = async (c: Context) => {
    const budgetId = c.req.param('id');
    const { user_id } = c.get('jwtPayload');

    try {
        const getExpensesByBudget = GetExpensesByBudget(); // returns all expenses for budget

        const expenses: any[] = getExpensesByBudget.all(user_id, budgetId);

        // if (expenses.length === 0) {
        //     return c.json({ success: false, message: 'No expenses found for this budget.' }, 404);
        // }

        const updateMonthly = SubtractOldMonthly();
        const deleteEmptyMonthly = DeleteEmptyMonthly();
        const deleteExpenseById = DeleteExpenseById();
        const updateUserTotal = SubtractUserTotal();
        const subtractOldCategory = SubtractOldCategory();
        const deleteZeroCategory = DeleteZeroCategory();
        const deleteBudget = DeleteBudgetById(); // deletes the budget row

        const transaction = db.transaction(() => {
            for (const expense of expenses) {
                const { id, amount, date, category_id } = expense;
                const expenseDate = new Date(date);
                const year = expenseDate.getFullYear();
                const month = expenseDate.getMonth() + 1;

                updateMonthly.run(amount, user_id, year, month);
                deleteEmptyMonthly.run(user_id, year, month);
                subtractOldCategory.run(amount, user_id, category_id);
                deleteZeroCategory.run(user_id, category_id);

                const result = deleteExpenseById.run(id);
                if (result.changes === 0) {
                    throw new Error(`Expense ${id} not deleted`);
                }

                updateUserTotal.run(amount, user_id);
            }

            // Delete the actual budget record
            const budgetResult = deleteBudget.run(budgetId);

            if (budgetResult.changes === 0) {
                throw new Error('Failed to delete budget');
            }

        });

        transaction();

        return c.json({ success: true, message: 'Budget and its expenses deleted successfully!' });

    } catch (error) {
        console.error('Delete budget error:', error);
        return c.json({ success: false, message: 'Failed to delete budget and expenses.' }, 500);
    }
}