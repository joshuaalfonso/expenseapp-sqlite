import db from "../db/index.js";


export const SubtractOldMonthly = () => {
    return db.prepare(`
        UPDATE 
            monthly_totals 
            SET total = total - ? 
        WHERE 
            user_id = ? AND year = ? AND month = ?
    `);
}


export const DeleteZeroMonthly = () => {
    return db.prepare(`
        DELETE FROM 
            monthly_totals 
        WHERE 
            user_id = ? AND year = ? AND month = ? AND total <= 0
    `);
}

export const UpsertMonthly = () => {
    return db.prepare(`
        INSERT INTO 
            monthly_totals (user_id, year, month, total) VALUES (?, ?, ?, ?)
        ON CONFLICT
            (user_id, year, month)
        DO UPDATE 
            SET total = total + excluded.total
    `);
}







