import db from "../db/index.js";



export const AddCategoryTotal = () => {
    return db.prepare(`
        UPDATE 
            category_totals 
        SET 
            total = total + ? 
        WHERE 
            user_id = ? AND category = ?
    `);
}  


export const SubtractOldCategory = () => {
    return db.prepare(`
        UPDATE 
            category_totals 
        SET 
            total = total - ?,
            total_entries = category_totals.total_entries - 1
        WHERE 
            user_id = ? AND category_id = ?
    `);
}

export const UpsertCategory = () => {
    return db.prepare(`
        INSERT INTO 
            category_totals (user_id, category_id, total, last_updated) VALUES (?, ?, ?, ?)
        ON CONFLICT
            (user_id, category_id)
        DO UPDATE  
        SET 
            total = total + excluded.total,
            total_entries = category_totals.total_entries + 1
    `);
}

export const DeleteZeroCategory = () => {
    return db.prepare(`
        DELETE FROM 
            category_totals 
        WHERE 
            user_id = ? AND category_id = ? AND total <= 0
    `); 
}