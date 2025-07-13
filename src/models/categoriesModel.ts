import db from "../db/index.js";



export const AllCategoriesPerUser = (user_id: number) => {
    return db.prepare(`
        SELECT 
            * 
        FROM 
            categories 
        WHERE 
            (user_id = ? AND is_del = ?) OR (is_default = ?)
    `).all(user_id, 0, 1);
}


export const InsertCategory = (
    id: number,
    user_id: number,
    category_name: string,
    category_icon: string,
    is_default: number
) => {

    return db.prepare(
        `INSERT INTO categories (id, user_id, category_name, category_icon, is_default)
        VALUES (?, ?, ?, ?, ?)`
    ).run(id, user_id, category_name, category_icon, is_default);

}


export const UpdateCategory = (
    category_name: string,
    category_icon: string,
    is_default: number,
        id: number,
) => {

    return db.prepare(`
        UPDATE 
            categories
        SET 
            category_name = ?, category_icon = ?, is_default = ?
        WHERE 
            id = ?
    `).run(category_name, category_icon, is_default, id);

}


export const DeleteCategoryById = (id: number) => {
    return db.prepare(`
        UPDATE 
            categories 
        SET 
            is_del = 1 WHERE id = ?
    `).run(id);
}