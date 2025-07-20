import db from "../db/index.js";



export const AllCategoriesPerUser = (user_id: number) => {
    return db.prepare(`
        SELECT
            c.id, 
            c.category_name,
            c.category_icon,
            c.description,
            c.is_default,
            c.date_created,
            IFNULL(ct.total, 0) AS total_expense,
            IFNULL(ct.total_entries, 0) as total_entries,
            ct.last_updated
        FROM 
            categories c
        LEFT JOIN
            category_totals ct
        ON
            c.id = ct.category_id
        WHERE 
            (c.user_id = ? AND c.is_del = ?) OR (c.is_default = ?)
        ORDER BY
            c.category_name ASC
    `).all(user_id, 0, 1);
}

export const PaginatedCategoriesPerUser = () => {
    return db.prepare(`
        SELECT
            c.id, 
            c.category_name,
            c.category_icon,
            c.description,
            c.is_default,
            c.date_created,
            IFNULL(ct.total, 0) AS total_expense,
            IFNULL(ct.total_entries, 0) as total_entries,
            ct.last_updated
        FROM 
            categories c
        LEFT JOIN
            category_totals ct
        ON
            c.id = ct.category_id AND ct.user_id = ?
        WHERE 
            (c.user_id = ? AND c.is_del = 0)
            OR (c.is_default = 1)
        ORDER BY 
            c.category_name ASC
        LIMIT ? OFFSET ?    
    `)
}

//  (c.user_id = ? AND c.is_del = 0)
//             OR (c.is_default = 1)

export const CategoriesTotalCountPerUser = () => {
    return db.prepare(
            `
                SELECT 
                    COUNT(*) AS total 
                FROM 
                    categories 
                WHERE 
                    (user_id = ? AND is_del = 0) OR (is_default = 1)
                    
            `
    );
}


export const InsertCategory = (
    id: number,
    user_id: number,
    category_name: string,
    category_icon: string,
    description: string,
    is_default: number
) => {

    return db.prepare(
        `INSERT INTO categories (id, user_id, category_name, category_icon, description, is_default)
        VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, user_id, category_name, category_icon, description, is_default);

}


export const UpdateCategory = (
    category_name: string,
    category_icon: string,
    description: string,
    is_default: number,
        id: number,
) => {

    return db.prepare(`
        UPDATE 
            categories
        SET 
            category_name = ?, category_icon = ?, description = ?, is_default = ?
        WHERE 
            id = ?
    `).run(category_name, category_icon, description, is_default, id);

}


export const DeleteCategoryById = (id: number) => {
    return db.prepare(`
        UPDATE 
            categories 
        SET 
            is_del = 1 WHERE id = ?
    `).run(id);
}