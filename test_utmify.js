import './server/node_modules/dotenv/config.js'; // Ensure env is loaded
import pool from './server/db/pool.js';
import { sendPostback } from './server/services/utmifyService.js';

async function runTest() {
    try {
        console.log("Consultando pedidos recentes...");
        const res = await pool.query('SELECT id, status FROM orders ORDER BY created_at DESC LIMIT 1');

        if (res.rowCount === 0) {
            console.log("Nenhum pedido encontrado. Crie um pedido primeiro.");
            process.exit(1);
        }

        const testOrderId = res.rows[0].id;
        console.log(`Testando postback para o order_id: ${testOrderId}`);

        await sendPostback(testOrderId);

        console.log("Postback finalizado.");
        process.exit(0);
    } catch (err) {
        console.error("Erro no teste:", err);
        process.exit(1);
    }
}

runTest();
