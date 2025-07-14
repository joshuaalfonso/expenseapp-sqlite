import db from "../db/index.js";


export const AllBudgetsPerUser = () => {

    return db.prepare(`
        SELECT 
            b.id,
            b.budget_name,
            b.budget_icon,
            b.amount AS budget_amount,
            COUNT(e.id) AS total_items,
            IFNULL(SUM(e.amount), 0) AS total_expense_amount,
            b.date_created
            FROM budgets b
        LEFT JOIN 
            expenses e 
        ON 
            e.budget_id = b.id 
        WHERE 
            b.user_id = ? AND b.is_del = 0
        GROUP 
            BY b.id
    `)

}


export const BudgetDetails = () => {
    return db.prepare(`
        SELECT 
            id,
            budget_name,
            budget_icon,
            amount AS budget_amount,
            date_created
        FROM 
            budgets
        WHERE 
            id = ? AND is_del = 0
    `)
}


export const GetExpensesByBudget = () => {
    return db.prepare(`
        SELECT 
            * 
        FROM 
            expenses 
        WHERE 
            user_id = ? AND budget_id = ?
    `)
}


export const InsertBudget = () => {
    return db.prepare(`
        INSERT INTO 
            budgets (id, user_id, budget_name, budget_icon, amount)
        VALUES 
            (?, ?, ?, ?, ?)
    `)
}


export const UpdateBudget = () => {
    return db.prepare(`
        UPDATE 
            budgets 
        SET 
            budget_name = ?, budget_icon = ?, amount = ?
        WHERE 
            id = ?
    `)
}


export const DeleteBudgetById = () => {
    return db.prepare(
      `DELETE FROM budgets WHERE id = ?`
    );
}