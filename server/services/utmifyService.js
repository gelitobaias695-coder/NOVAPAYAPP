import pool from '../db/pool.js';

export async function sendPostback(orderId) {
    try {
        // 1. Get UTMify credentials
        const credsRes = await pool.query(
            "SELECT secret_key AS api_token, public_key AS platform_name FROM gateway_settings WHERE gateway_name = 'utmify' LIMIT 1"
        );
        if (credsRes.rowCount === 0 || !credsRes.rows[0].api_token) {
            console.log('[UTMify] API Token not configured. Skipping postback.');
            return;
        }
        const { api_token, platform_name } = credsRes.rows[0];

        // 2. Get Order and Product details
        const orderRes = await pool.query(
            `SELECT o.*, 
                    p.name AS main_product_name, 
                    p.price AS main_product_price 
             FROM orders o
             JOIN products p ON o.product_id = p.id
             WHERE o.id = $1`,
            [orderId]
        );

        if (orderRes.rowCount === 0) {
            console.warn(`[UTMify] Order ${orderId} not found.`);
            return;
        }

        const order = orderRes.rows[0];
        const status = order.status === 'success' ? 'paid' : 'waiting_payment';

        // Conversão de moedas não suportadas (ex: ZAR) pela UTMify para USD
        const allowedCurrencies = ["BRL", "USD", "EUR", "GBP", "ARS", "CAD", "COP", "MXN", "PYG", "CLP", "PEN", "PLN", "UAH", "CHF", "THB", "AUD"];
        let baseCurrency = order.currency || 'USD';
        let conversionRate = 1;

        if (!allowedCurrencies.includes(baseCurrency.toUpperCase())) {
            // Conversão bruta genérica se não suportada (Ex: ZAR ~ 18, KES ~ 130)
            if (baseCurrency === 'ZAR') conversionRate = 19;
            else if (baseCurrency === 'KES') conversionRate = 130;
            else if (baseCurrency === 'NGN') conversionRate = 1500;
            baseCurrency = 'USD';
        }

        const applyConversion = (val) => Math.round((parseFloat(val) / conversionRate) * 100);

        const amountInCents = applyConversion(order.amount);

        // We assume 1 main product + bumps
        const products = [
            {
                id: order.product_id,
                name: order.main_product_name,
                planId: order.product_id,       // Requerido
                planName: 'Único',              // Requerido
                priceInCents: applyConversion(order.main_product_price), // Requerido (Mudou de price -> priceInCents)
                quantity: 1
            }
        ];

        // Fetch bumps if available
        if (order.bump_products && order.bump_products.length > 0) {
            const bumpsRes = await pool.query(
                `SELECT id, name, price FROM products WHERE id = ANY($1)`,
                [order.bump_products]
            );
            for (const bump of bumpsRes.rows) {
                products.push({
                    id: bump.id,
                    name: bump.name,
                    planId: bump.id,
                    planName: 'Order Bump',
                    priceInCents: applyConversion(bump.price),
                    quantity: 1
                });
            }
        }

        const nowIso = new Date().toISOString();

        // Format for UTMify docs:
        const payload = {
            platform: platform_name || 'NovaPay',
            orderId: order.id.toString(),
            paymentMethod: 'credit_card', // Forçado credit_card para paystack
            status,
            createdAt: order.created_at ? new Date(order.created_at).toISOString() : nowIso,
            approvedDate: status === 'paid' ? nowIso : null,
            customer: {
                name: order.customer_name || 'Desconhecido',
                email: order.customer_email || 'vazio@email.com',
                document: "", // Requerido obrigatoriamente
                phone: order.customer_phone || '',
                country: order.country || 'MZ',
                city: order.city || '',
                state: order.province || '',
                zipCode: order.postal_code || '',
                ip: '127.0.0.1'
            },
            products,
            trackingParameters: {
                src: order.utm_source || '',
                utm_source: order.utm_source || '',
                utm_medium: order.utm_medium || '',
                utm_campaign: order.utm_campaign || '',
                utm_content: order.utm_content || '',
                utm_term: order.utm_term || ''
            },
            commission: {
                totalPriceInCents: amountInCents,
                gatewayFeeInCents: Math.round(amountInCents * 0.029), // Estimativa de taxa
                userCommissionInCents: Math.round(amountInCents * 0.971), // Seu lucro líquido
                currency: baseCurrency
            }
        };

        console.log(`[UTMify] Sending postback for order ${order.id}...`);

        const response = await fetch('https://api.utmify.com.br/api-credentials/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-token': api_token
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[UTMify] Failed to send postback: ${response.status} - ${errorText}`);
        } else {
            console.log(`[UTMify] Postback sent successfully for order ${order.id}.`);
        }
    } catch (err) {
        console.error('[UTMify] Error processing postback:', err);
    }
}
