import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function run() {
    const file = process.argv[2];
    if (!file) {
        console.error('No file provided');
        process.exit(1);
    }
    const sql = readFileSync(join(__dirname, 'migrations', file), 'utf8');
    const client = await pool.connect();
    try {
        console.log(`Running migration ${file}…`);
        await client.query(sql);
        console.log('✅ Migration complete.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
