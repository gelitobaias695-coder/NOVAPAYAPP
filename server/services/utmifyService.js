import pool from '../db/pool.js';

/**
 * Sends a normalized order payload to UTMify API.
 * Follows the official documentation for api-credentials/orders endpoint.
 */
export async function sendUtmifyOrder(normalizedOrder) {
    try {
        // 1. Get UTMify credentials
        const credsRes = await pool.query(
            "SELECT secret_key AS api_token, public_key AS platform_name FROM gateway_settings WHERE gateway_name = 'utmify' LIMIT 1"
        );
        if (credsRes.rowCount === 0 || !credsRes.rows[0].api_token) {
            console.log('[UTMify] API Token not configured in DB. Skipping postback.');
            return;
        }
        const { api_token, platform_name } = credsRes.rows[0];

        console.log(`[UTMify] Using token: ${api_token.substring(0, 4)}...${api_token.substring(api_token.length - 4)} (Length: ${api_token.length})`);

        const nowIso = new Date().toISOString();

        // Status mapping to UTMify allowed values: 
        // waiting_payment, paid, refused, refunded, chargedback
        let utmifyStatus = 'paid'; // Default
        const inputStatus = (normalizedOrder.status || '').toLowerCase();
        if (inputStatus === 'approved' || inputStatus === 'success' || inputStatus === 'paid') {
            utmifyStatus = 'paid';
        } else if (inputStatus === 'waiting_payment' || inputStatus === 'pending') {
            utmifyStatus = 'waiting_payment';
        } else if (inputStatus === 'refused' || inputStatus === 'failed') {
            utmifyStatus = 'refused';
        }

        // Payment Method mapping:
        // credit_card, boleto, pix, paypal, free_price
        let utmifyPaymentMethod = 'credit_card';
        const inputMethod = (normalizedOrder.paymentMethod || '').toLowerCase();
        if (inputMethod.includes('pix')) utmifyPaymentMethod = 'pix';
        else if (inputMethod.includes('boleto')) utmifyPaymentMethod = 'boleto';
        else if (inputMethod.includes('paypal')) utmifyPaymentMethod = 'paypal';

        // Calculate float price for products (UTMify API uses decimal price, not cents)
        const products = (normalizedOrder.products || []).map(p => {
            let floatPrice = 0;
            if (p.price) {
                floatPrice = parseFloat(p.price);
            } else if (p.priceInCents) {
                floatPrice = p.priceInCents / 100;
            } else if (p.price_in_cents) {
                floatPrice = p.price_in_cents / 100;
            }

            return {
                id: p.id?.toString(),
                name: p.name || 'Produto',
                quantity: parseInt(p.quantity || 1),
                price: floatPrice
            };
        });

        const payload = {
            orderId: normalizedOrder.orderId.toString(),
            platform: platform_name || normalizedOrder.platform || 'NovaPay',
            paymentMethod: utmifyPaymentMethod,
            status: utmifyStatus,
            createdAt: normalizedOrder.createdAt || nowIso,
            approvedDate: (utmifyStatus === 'paid') ? (normalizedOrder.approvedDate || nowIso) : null,
            customer: {
                name: normalizedOrder.customerName || 'Cliente',
                email: normalizedOrder.customerEmail || 'vazio@email.com',
                document: normalizedOrder.customerDocument || "00000000000",
                phone: normalizedOrder.customerPhone || ''
            },
            products: products,
            trackingParameters: normalizedOrder.trackingParameters || {
                src: '', utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', utm_term: ''
            }
        };

        console.log(`[UTMify] Sending postback for order ${payload.orderId} (Status: ${utmifyStatus})...`);

        let fetchFn = typeof fetch === 'function' ? fetch : null;
        if (!fetchFn) {
            const nodeFetch = await import('node-fetch');
            fetchFn = nodeFetch.default;
        }

        // CORRECT ENDPOINT per documentation: https://api.utmify.com.br/api-credentials/orders
        const response = await fetchFn('https://api.utmify.com.br/api-credentials/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-token': api_token
            },
            body: JSON.stringify(payload)
        });

        const respText = await response.text();
        if (!response.ok) {
            console.error(`[UTMify] Error: ${response.status} - ${respText}`);
            console.log(`[UTMify] Debug Payload:`, JSON.stringify(payload));
        } else {
            console.log(`[UTMify] Postback successful: ${respText}`);
        }
        return true;
    } catch (err) {
        console.error('[UTMify] Critical error in postback service:', err.message);
        return false;
    }
}

/**
 * Legacy wrapper for internal NovaPay orders
 */
export async function sendPostback(orderId) {
    try {
        const orderRes = await pool.query(
            `SELECT o.*, p.name AS main_product_name, p.price AS main_product_price 
             FROM orders o
             JOIN products p ON o.product_id = p.id
             WHERE o.id = $1`,
            [orderId]
        );

        if (orderRes.rowCount === 0) return;
        const order = orderRes.rows[0];

        // Basic normalization for local orders
        const products = [{
            id: order.product_id,
            name: order.main_product_name,
            price: order.main_product_price,
            quantity: 1
        }];

        const normalizedOrder = {
            orderId: order.id,
            platform: 'NovaPay',
            status: order.status === 'success' ? 'paid' : 'waiting_payment',
            createdAt: order.created_at,
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            customerPhone: order.customer_phone,
            products,
            trackingParameters: {
                src: order.src || '',
                utm_source: order.utm_source || '',
                utm_medium: order.utm_medium || '',
                utm_campaign: order.utm_campaign || '',
                utm_content: order.utm_content || '',
                utm_term: order.utm_term || ''
            }
        };

        return sendUtmifyOrder(normalizedOrder);
    } catch (err) {
        console.error('[UTMify] sendPostback error:', err.message);
    }
}
