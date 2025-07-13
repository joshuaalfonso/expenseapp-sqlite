import db from "../db/index.js"


export const AllExpensesPerUser = (user_id:number) => {
     return db.prepare(`
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
}

export const AllPaginatedExpensesPerUser = (
    user_id: number, 
    sortBy: string,
    limit: number, 
    offset: number
) => {
    return db.prepare(`
        SELECT 
            e.id,
            e.budget_id,
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
}


export const ExpenseTotalCountPerUser = (user_id: number) => {
    return db.prepare(
            `
                SELECT 
                    COUNT(*) AS total 
                FROM 
                    expenses 
                WHERE 
                    user_id = ? 
            `
    ).get(user_id);
}

export const InsertExpense = () => {
    return db.prepare(`
        INSERT INTO 
            expenses (id, date, budget_id, category_id, amount, description, user_id)
        VALUES 
            (?, ?, ?, ?, ?, ?, ?)
    `);
}


export const UpsertMonthlyTotal = () => {
    return db.prepare(`
        INSERT INTO 
            monthly_totals (user_id, year, month, total) VALUES (?, ?, ?, ?)
        ON CONFLICT
            (user_id, year, month)
        DO UPDATE 
            SET total = total + excluded.total
    `);
}

export const CheckExpense = () => {
    return db.prepare(
        `
            SELECT 
                amount, date 
            FROM 
                expenses 
            WHERE 
                id = ? AND user_id = ?
        `
    );
}

export const UpdateExpense = () => {
    return db.prepare(`
        UPDATE 
            expenses
        SET 
            date = ?, category_id = ?, amount = ?, description = ?
        WHERE 
            id = ?
    `);
}

export const DeleteEmptyMonthly = () => {
    return db.prepare(`
        DELETE FROM 
            monthly_totals 
        WHERE 
            user_id = ? AND year = ? AND month = ? AND total <= 0
    `);
}


export const DeleteExpenseById = () => {
    return db.prepare(`
        DELETE FROM 
            expenses 
        WHERE id = ?
    `);
}

