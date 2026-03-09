import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_E5gnlcsX3xZO@ep-wandering-waterfall-acc3u6cs-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=verify-full"
});

async function run() {
    const res = await pool.query("SELECT id, name, logo_url, product_image_url FROM products ORDER BY created_at DESC LIMIT 5");
    console.log("Recent products:", res.rows);
    process.exit(0);
}
run();
