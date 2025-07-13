import db from "../db/index.js";



export const SubtractAddOldUserTotals = () => {
    return db.prepare(`
        UPDATE 
            user_totals 
        SET 
            total_expense = total_expense - ? + ? 
        WHERE 
            user_id = ?
    `);
} 

export const AddUserTotal = () => {
    return db.prepare(`
        UPDATE 
            user_totals 
        SET 
            total_expense = total_expense + ? 
        WHERE 
            user_id = ?
    `);
}  

export const SubtractUserTotal = () => {
    return db.prepare(`
        UPDATE 
            user_totals 
        SET 
            total_expense = total_expense - ? 
        WHERE 
            user_id = ?
    `);
}

