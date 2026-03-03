import pool from './db/pool.js';
import crypto from 'crypto';

async function run() {
    try {
        const productRes = await pool.query("SELECT * FROM products WHERE name ILIKE '%Produto Físico Teste%' LIMIT 1");
        const product = productRes.rows[0];

        if (!product) {
            console.log("Erro: 'Produto Físico Teste' não encontrado!");
            process.exit(1);
        }

        const orderId = crypto.randomUUID();

        await pool.query(`
            INSERT INTO orders (
                id, product_id, customer_name, customer_email, amount, currency, status, checkout_type, device_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            orderId, product.id, "Teste Redirect", "teste@novapay.co", product.price, product.currency, "success", product.type, "desktop"
        ]);

        console.log("Simulação Criada com Sucesso!");
        console.log(`\n\nAbra este link no seu navegador para ver o redirecionamento funcionar na prática:\nhttp://localhost:8081/checkout/sucesso?order_id=${orderId}\n\n`);

    } catch (e) {
        console.error("Erro:", e);
    } finally {
        process.exit(0);
    }
}
run();
