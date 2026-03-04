import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace('?sslmode=require', '?sslmode=verify-full');
}

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await pool.query(`
            INSERT INTO platform_settings (id, logo_url, favicon_url)
            VALUES (1, '/logo-novapay.svg', '/favicon.svg')
            ON CONFLICT (id) 
            DO UPDATE SET 
                logo_url = '/logo-novapay.svg',
                favicon_url = '/favicon.svg';
        `);
        console.log("Logos atualizados com sucesso!");
    } catch (err) {
        console.error("Erro:", err);
    } finally {
        pool.end();
    }
}
run();
