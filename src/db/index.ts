// db.ts
import Database from 'better-sqlite3'

const db = new Database('expense_tracker.db'); // this creates a file 'data.db' in your root
db.pragma('foreign_keys = ON');

// Create the users table if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS "users" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "google_id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "picture" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'user',
        "date_created" TEXT NOT NULL DEFAULT (datetime('now'))
    );
`)

// Create the users user_totals if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS "user_totals" (
        "id"	INTEGER,
        "user_id"	INTEGER NOT NULL,
        "total_expense"	INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY("id" AUTOINCREMENT),
        UNIQUE("user_id"),
        FOREIGN KEY("user_id") REFERENCES "users"("id")
    );    
`)

// Create the users monthly_totals if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS "monthly_totals" (
        "id"	INTEGER,
        "user_id"	INTEGER NOT NULL,
        "year"	INTEGER NOT NULL,
        "month"	INTEGER NOT NULL,
        "total"	INTEGER NOT NULL,
        PRIMARY KEY("id" AUTOINCREMENT),
        UNIQUE("user_id","year","month")
    );    
`)

// Create the categories table if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS "categories" (
        "id"	INTEGER,
        "user_id"	INTEGER,
        "category_name"	TEXT NOT NULL,
        "category_icon"	TEXT NOT NULL,
        "is_default"	INTEGER NOT NULL DEFAULT 0,
        "is_del"	INTEGER NOT NULL DEFAULT 0,
        "date_created"	TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY("id" AUTOINCREMENT),
        FOREIGN KEY("user_id") REFERENCES "users"("id")
    );   
`)

// Create the expenses table if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS "expenses" (
        "id"	INTEGER,
        "user_id"	INTEGER NOT NULL,
        "category_id"	INTEGER NOT NULL,
        "amount"	INTEGER NOT NULL,
        "description"	TEXT,
        "date"	TEXT NOT NULL,
        "date_created"	TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY("id" AUTOINCREMENT),
        FOREIGN KEY("category_id") REFERENCES "categories"("id"),
        FOREIGN KEY("user_id") REFERENCES "users"("id")
    );    
`)


const defaultCategories = [
    { name: 'Food', icon: '🍔' },
    { name: 'Transport', icon: '🚗' },
    { name: 'Entertainment', icon: '🎬' },
    { name: 'Health', icon: '💊' },
    { name: 'Shopping', icon: '🛍️' },
    { name: 'Bills', icon: '📆' },
    { name: 'Coffee', icon: '☕️' },
    { name: 'Grocery', icon: '🛒' },
    { name: 'Others', icon: '❔' },
]

// Insert default categories only if they don't exist
const insertIfNotExists = db.prepare(`
    INSERT INTO 
        categories (user_id, category_name, category_icon, is_default)
    SELECT 
        NULL, ?, ?, 1
    WHERE NOT EXISTS (
        SELECT 1 FROM categories WHERE category_name = ? AND user_id IS NULL
    )
`)

for (const category of defaultCategories) {
  insertIfNotExists.run(category.name, category.icon, category.name)
}


export default db
