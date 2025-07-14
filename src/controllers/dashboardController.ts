import type { Context } from "hono";
import { CurrentMonthExpense, CurrentYearAverageExpense, CurrentYearMonthsExpense, GetTotalExpense, TopCategories } from "../models/dashboardModel.js";


export const GetSummaryReport = async (c: Context) => {

    const { user_id } = c.get('jwtPayload') as { user_id: number };
    const yearNow = new Date().getFullYear();

    const userTotalExpense = GetTotalExpense(user_id);

    const currentMonthExpense = CurrentMonthExpense(user_id);

    const topCategories = TopCategories(user_id);

    const currentYearMonthsExpense = CurrentYearMonthsExpense(user_id, yearNow);

    const currentYearAverageExpense = CurrentYearAverageExpense(user_id, yearNow);

    return c.json({
        totalExpense: userTotalExpense?.total_expense ?? 0,
        monthExpense: currentMonthExpense?.month_expense ?? 0,
        topCategories: topCategories,
        monthsExpense: currentYearMonthsExpense,
        averagePerMonth: currentYearAverageExpense?.average_monthly ?? 0,
    });

}

