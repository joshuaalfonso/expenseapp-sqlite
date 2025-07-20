import type { Context } from "hono";
import { 
    AllExpensesPerUser, 
    AllPaginatedExpensesPerUser, 
    CheckExpense, 
    DeleteEmptyMonthly, 
    DeleteExpenseById, 
    ExpenseTotalCountPerUser, 
    InsertExpense,
    UpdateExpense,
    UpsertMonthlyTotal
} from "../models/expensesModel.js"
import db from "../db/index.js";
import { DeleteZeroMonthly, SubtractOldMonthly, UpsertMonthly } from "../models/monthlyTotalsModel.js";
import { AddUserTotal, SubtractAddOldUserTotals, SubtractUserTotal } from "../models/userTotalsModel.js";
import { DeleteZeroCategory, SubtractOldCategory, UpsertCategory } from "../models/categoryTotalsModel.js";



export const fetchExpensesPerUser = async (c: Context) => {
    const { user_id } = c.get('jwtPayload') as { user_id: number };

    const data = AllExpensesPerUser(user_id);

    return c.json(data);
}


export const FetchPaginatedExpensesPerUser = async (c:Context) => {
    const { user_id } = c.get('jwtPayload');

    const page = parseInt(c.req.param('page') || '1');
    
    const sortBy = c.req.param('sortByValue')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const rows = AllPaginatedExpensesPerUser(user_id ,sortBy, limit, offset);

        const totalRow: any =  ExpenseTotalCountPerUser(user_id);

        const total = totalRow.total;

        return c.json({
            data: rows,
            currentPage: page,
            perPage: limit,
            total,
            totalPages: Math.ceil(total / limit),
        });
    }

    catch (error) {
        console.error(error);
        return c.json({ message: 'Failed to fetch data' }, 500);
    }

}


export const PostExpense = async (c: Context) => {
    const body = await c.req.json();
    const { user_id } = c.get('jwtPayload');
    const { id, date, budget_id, category_id, amount, description } = body;

    const year = new Date(date).getFullYear();
    const month = new Date(date).getMonth() + 1;
    const currentDateTime = new Date().toLocaleString();

    try {

        const insertExpense = InsertExpense();

        const updateUserTotal = AddUserTotal();

        const upsertMonthlyTotal = UpsertMonthlyTotal();

        const upsertCategoryTotal = UpsertCategory(); 


        const transaction = db.transaction(() => {
            insertExpense.run(id, date, budget_id, category_id, amount, description, user_id);
            updateUserTotal.run(amount, user_id);
            upsertMonthlyTotal.run(user_id, year, month, amount);
            upsertCategoryTotal.run(user_id, category_id, amount, currentDateTime)
        });

        transaction();

        return c.json({ success: true });
    }

    catch (error) {

        console.error(error);
        return c.json({ success: false, error: 'Failed to insert expense.' }, 500);
        
    }

}


export const PutExpense = async (c:Context) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { user_id } = c.get('jwtPayload');

    const {
        date: newDate,
        category_id: newCategoryId,
        amount: newAmount,
        description: newDescription
    } = body;

    const currentDateTime = new Date().toLocaleString();

    try {

        const getExpense = CheckExpense();

        const existing: any = getExpense.get(id, user_id);

        if (!existing) {
            return c.json({ success: false, message: 'Expense not found' }, 404);
        }

        const { category_id: oldCategoryId, amount: oldAmount, date: oldDate } = existing;

        const oldYear = new Date(oldDate).getFullYear();
        const oldMonth = new Date(oldDate).getMonth() + 1;
        const newYear = new Date(newDate).getFullYear();
        const newMonth = new Date(newDate).getMonth() + 1;

        const subtractOldMonthly = SubtractOldMonthly();
        const deleteZeroMonthly = DeleteZeroMonthly();
        const upsertMonthly = UpsertMonthly();

        const subtractOldCategory = SubtractOldCategory();
        const deleteZeroCategory = DeleteZeroCategory();
        const upsertCategory = UpsertCategory();

        const subractAddUserTotals = SubtractAddOldUserTotals();

        const updateExpense = UpdateExpense();

        const transaction = db.transaction(() => {

            subtractOldMonthly.run(oldAmount, user_id, oldYear, oldMonth);
            deleteZeroMonthly.run(user_id, oldYear, oldMonth);
            upsertMonthly.run(user_id, newYear, newMonth, newAmount);

            subtractOldCategory.run(oldAmount, user_id, oldCategoryId);
            deleteZeroCategory.run(user_id, oldCategoryId);
            upsertCategory.run(user_id, newCategoryId, newAmount, currentDateTime)

            subractAddUserTotals.run(oldAmount, newAmount, user_id);

            updateExpense.run(newDate, newCategoryId, newAmount, newDescription, id);
        });

        transaction();

        return c.json({ success: true, message: 'Successfully updated!' });

    }

    catch (error) {
        console.error('Update error:', error);
        return c.json({ success: false, error: 'Failed to update expense.' }, 500);
    }

}


export const DeleteExpense = async (c: Context) => {
    const id = c.req.param('expense_id');
    const amount = parseFloat(c.req.param('amount'));  
    const { user_id } = c.get('jwtPayload');

    try {

        const getExpense = CheckExpense();

        const expense: any = await getExpense.get(id, user_id);

        if (!expense) {
            return c.json({ success: false, message: 'Expense not found' }, 404);
        }

        const { date, category_id: OldCategoryId } = expense;
        const year = new Date(date).getFullYear();
        const month = new Date(date).getMonth() + 1;

        const updateMonthly = SubtractOldMonthly();
        const deleteEmptyMonthly = DeleteEmptyMonthly();

        const subtractOldCategory = SubtractOldCategory();
        const deleteZeroCategory = DeleteZeroCategory();

        const deleteExpenseById  = DeleteExpenseById();

        const updateUserTotal = SubtractUserTotal();

        const transaction = db.transaction(() => {

            updateMonthly.run(amount, user_id, year, month);
            deleteEmptyMonthly.run(user_id, year, month);

            subtractOldCategory.run(amount, user_id, OldCategoryId);
            deleteZeroCategory.run(user_id, OldCategoryId);

            const result = deleteExpenseById.run(id);
            
            if (result.changes === 0) {
                throw new Error('Expense not found during delete');
            }

            updateUserTotal.run(amount, user_id);
            
        });

        transaction();

        return c.json({ success: true, message: 'Successfully deleted!' });

    }

    catch (error) {
        console.error('Delete error:', error);
        return c.json({ success: false, message: 'Failed to delete expense.' }, 500);
    }

}


