import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_E5gnlcsX3xZO@ep-wandering-waterfall-acc3u6cs-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
});

async function run() {
    try {
        const utmify = await pool.query("SELECT * FROM gateway_settings WHERE gateway_name = 'utmify'");
        console.log("UTMify Settings:", utmify.rows);
        const email = await pool.query("SELECT * FROM email_settings");
        console.log("Email Settings:", email.rows);
        const latestOrder = await pool.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 1");
        console.log("Latest Order:", latestOrder.rows[0]);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
