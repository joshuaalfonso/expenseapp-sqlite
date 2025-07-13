import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { jwt } from "hono/jwt";
import { DeleteCategory, GetAllCategories, PostCategory, PutCategory } from "../controllers/categoriesController.js";


// type JwtPayload = {
//   user_id: number;
//   sub: string;
//   email: string;
//   exp: number;
// };

export const categories = new Hono();

categories.use('*', authMiddleware);

categories.get('/', GetAllCategories)

categories.post('/', PostCategory);

categories.put('/:id', PutCategory);

categories.delete('/:categories_id', DeleteCategory);