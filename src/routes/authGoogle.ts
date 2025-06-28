import { Hono } from "hono";
import { decodeJwt, SignJWT } from "jose";
import db from "../db/index.js";
import 'dotenv/config';


export const authGoogle = new Hono();

authGoogle.post('/', async (c) => {

    const body = await c.req.json();
    const code = body.code;

    if (!code) return c.json({ error: 'Missing code' }, 400);

     // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'postmessage',
        grant_type: 'authorization_code',
        }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
        return c.json({ error: 'Token exchange failed', details: tokenData }, 500);
    }

    const { id_token } = tokenData;

    // Decode Google ID token to get user info
    const user = decodeJwt(id_token);  

    const { email, name, picture, sub: google_Id } = user;

    // Check if user exists
    const existingUser: any = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);

    let user_id;
    let role;

    if (!existingUser) {
        // Insert user
        const insertUserStmt = db.prepare(
        `INSERT INTO users (email, name, picture, google_id) VALUES (?, ?, ?, ?)`
        );
        const result = insertUserStmt.run(email, name, picture, google_Id);

        user_id = result.lastInsertRowid;
        role = 'user';

        // Insert user total
        db.prepare(`INSERT INTO user_totals (user_id, total_expense) VALUES (?, 0)`)
        .run(user_id);
    } else {
        user_id = existingUser.id;
        role = existingUser.role;
    }

     const tokenPayload = {
        user_id,
        sub: user.sub,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + 7200,
    };

    const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET);
    const customToken = await new SignJWT(tokenPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(tokenPayload.exp)
        .sign(jwtSecret);

    return c.json({ jwt: customToken, user: { ...user, exp: tokenPayload.exp, user_id, role  } });

})