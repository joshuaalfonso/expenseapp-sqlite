import type { Context } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";
import { AllCategoriesPerUser, CategoriesTotalCountPerUser, DeleteCategoryById, InsertCategory, PaginatedCategoriesPerUser, UpdateCategory } from "../models/categoriesModel.js";



const PAGE_LIMIT = 10;
export const GetAllCategories = async (c: Context) => {

    const { user_id } = c.get('jwtPayload');

    const rows = AllCategoriesPerUser(user_id);
    return c.json(rows);

}

export const GetPaginatedCategories = async(c: Context) => {

    const { user_id } = c.get('jwtPayload');
    const page = parseInt(c.req.param('page') || '1');
    const offset = (page - 1) * PAGE_LIMIT;

    try {

        const rows = PaginatedCategoriesPerUser().all(user_id, PAGE_LIMIT, offset);

        const {total}: any =  CategoriesTotalCountPerUser().get(user_id);

        return c.json({
            data: rows,
            currentPage: page,
            perPage: PAGE_LIMIT,
            total,
            totalPages: Math.ceil(total / PAGE_LIMIT),
        });
    }

    catch (error) {
        console.error(error);
        return c.json({ message: 'Failed to fetch data' }, 500);
    }

}


export const PostCategory = async (c: Context) => {

    const body = await c.req.json();
    const { id, category_name, category_icon, description, is_default } = body;
    const { user_id } = c.get('jwtPayload');

    try {
        const result = InsertCategory(id, user_id, category_name, category_icon, description, is_default);
        return c.json({ success: true, result });
    }

    catch (error) {
        console.error(error);
        return c.json({ success: false, error: 'Failed to insert category.' }, 500);
    }

}

export const PutCategory = async (c: Context) => {

    const id = c.req.param('id');
    const body = await c.req.json();
    const { category_name, category_icon, description, is_default } = body;

    try {

        const result = UpdateCategory(category_name, category_icon, description, is_default, +id);

        if (result.changes === 0) {
            return c.json({ success: false, error: 'Category not found.' }, 404);
        }

        return c.json({ success: true, result });
    }

    catch (error) {
        console.error('Update error:', error);
        return c.json({ success: false, error: 'Failed to update category.' }, 500);
    }

}


export const DeleteCategory = async (c: Context) => {

    const id = c.req.param('categories_id');

    try {

        const result = DeleteCategoryById(+id);

        if (result.changes === 0) {
            return c.json({ success: false, message: 'No category found with that ID.' }, 404);
        }
        
        return c.json({ success: true, result });

    }

    catch (error) {
        console.error('Delete error:', error);
        return c.json({ success: false, message: 'Failed to delete category.' }, 500);
    }

}





