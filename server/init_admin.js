import pg from 'pg';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = process.env.DATABASE_URL
    ? new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    })
    : null;

async function run() {
    if (!pool) return console.error("No DATABASE_URL");
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                reset_token VARCHAR(255),
                reset_token_expires TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("Admins table ensured.");

        // Check if admin exists
        const res = await pool.query("SELECT * FROM admins LIMIT 1");
        if (res.rowCount === 0) {
            const hash = await bcrypt.hash("admin123", 10);
            await pool.query(
                "INSERT INTO admins (name, email, password_hash) VALUES ($1, $2, $3)",
                ["Administrador", "admin@novapay.co", hash]
            );
            console.log("Default admin created: admin@novapay.co / admin123");
        } else {
            console.log("Admin already exists.");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
