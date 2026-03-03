import { v4 as uuidv4 } from 'uuid';
import pool from './db/pool.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function run() {
    try {
        const productRes = await pool.query("SELECT * FROM products WHERE name ILIKE '%Produto Físico Teste%' LIMIT 1");
        const product = productRes.rows[0];

        if (!product) {
             console.log("Erro: 'Produto Físico Teste' não encontrado!");
             process.exit(1);
        }

        const orderId = uuidv4();
        
        await pool.query(`
            INSERT INTO orders (
                id, product_id, customer_name, customer_email, amount, currency, status, checkout_type, device_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            orderId, product.id, "Teste do Sistema", "teste@novapay.co", product.price, product.currency, "success", product.type, "desktop"
        ]);

        console.log("Simulação Criada com Sucesso!");
        console.log(`Abra este link no seu navegador para ver o redirecionamento: http://localhost:8081/checkout/sucesso?order_id=${orderId}`);

    } catch (e) {
        console.error("Erro:", e);
    } finally {
        process.exit(0);
    }
}
run();
