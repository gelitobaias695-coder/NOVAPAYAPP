import pool from './server/db/pool.js';
import * as dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

async function checkGateway() {
    try {
        const res = await pool.query("SELECT * FROM gateway_settings WHERE gateway_name = 'paystack'");
        console.log(res.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
checkGateway();
