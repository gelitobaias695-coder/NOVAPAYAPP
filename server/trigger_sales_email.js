import pool from './db/pool.js';
import { sendOrderConfirmation } from './services/emailService.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function run() {
    try {
        console.log("Conectando ao banco de dados para criar ordens de teste...");
        const targetEmail = 'octaviojochua@gmail.com';

        let productRes = await pool.query('SELECT id, type, name FROM products LIMIT 2');

        let physicalProductId = null;
        let digitalProductId = null;

        for (const p of productRes.rows) {
            if (p.type === 'physical') physicalProductId = p.id;
            else if (p.type === 'digital') digitalProductId = p.id;
        }

        if (!physicalProductId && productRes.rowCount > 0) physicalProductId = productRes.rows[0].id;
        if (!digitalProductId && productRes.rowCount > 0) digitalProductId = productRes.rows[0].id;

        if (!physicalProductId) {
            console.error("Nenhum produto encontrado no banco para atrelar a ordem. Crie um produto primeiro!");
            process.exit(1);
        }

        const physicalOrderRes = await pool.query(
            "INSERT INTO orders (product_id, customer_name, customer_email, amount, currency, status, checkout_type, country) " +
            "VALUES ($1, 'Octavio (Teste Físico)', $2, 197.50, 'BRL', 'success', 'physical', 'BR') " +
            "RETURNING id",
            [physicalProductId, targetEmail]
        );
        const physicalOrderId = physicalOrderRes.rows[0].id;

        const digitalOrderRes = await pool.query(
            "INSERT INTO orders (product_id, customer_name, customer_email, amount, currency, status, checkout_type, country) " +
            "VALUES ($1, 'Octavio (Teste Digital)', $2, 49.90, 'BRL', 'success', 'digital', 'BR') " +
            "RETURNING id",
            [digitalProductId, targetEmail]
        );
        const digitalOrderId = digitalOrderRes.rows[0].id;

        console.log("✅ Criada ordem física fictícia ID: " + physicalOrderId);
        console.log("✅ Criada ordem digital fictícia ID: " + digitalOrderId);
        console.log("🚀 Disparando sistema oficial de e-mails de pós-venda para: " + targetEmail + "...");

        await sendOrderConfirmation(physicalOrderId);
        await sendOrderConfirmation(digitalOrderId);

        console.log("✨ Tudo pronto! O serviço nativo enviou ambos os e-mails com sucesso para a caixa de entrada!");
        setTimeout(() => process.exit(0), 4000); // Dar um tempinho para o nodemailer disparar

    } catch (err) {
        console.error("❌ Erro no script de disparo:", err);
        process.exit(1);
    }
}

run();
