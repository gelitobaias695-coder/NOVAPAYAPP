/**
 * Runs ALL migrations in order against Neon database.
 * Usage: node db/run-all-migrations.js
 */
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function runAllMigrations() {
    const client = await pool.connect();
    try {
        // Create migrations tracking table
        await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

        const migrationsDir = join(__dirname, 'migrations');
        const files = readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        console.log(`Found ${files.length} migration files.`);

        for (const file of files) {
            // Check if already applied
            const { rows } = await client.query(
                'SELECT id FROM _migrations WHERE filename = $1',
                [file]
            );

            if (rows.length > 0) {
                console.log(`  ⏭  ${file} — already applied`);
                continue;
            }

            const sql = readFileSync(join(migrationsDir, file), 'utf8');
            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query(
                    'INSERT INTO _migrations (filename) VALUES ($1)',
                    [file]
                );
                await client.query('COMMIT');
                console.log(`  ✅ ${file} — applied`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`  ❌ ${file} — FAILED: ${err.message}`);
                // For ALTER TABLE errors that are non-fatal (column already exists), continue
                if (err.message.includes('already exists')) {
                    console.log(`     ↳ Skipping (already exists)`);
                    // Mark as applied anyway
                    await client.query(
                        'INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
                        [file]
                    );
                } else {
                    throw err;
                }
            }
        }

        console.log('\n🎉 All migrations complete!');
    } catch (err) {
        console.error('Migration runner failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runAllMigrations();
