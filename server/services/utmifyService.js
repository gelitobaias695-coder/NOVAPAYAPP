import pool from '../db/pool.js';

/**
 * Sends a normalized order payload to UTMify API.
 * Updated to match the strict schema validation required by the API.
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

        const nowIso = new Date().toISOString();

        // Status mapping to UTMify allowed values
        let utmifyStatus = 'paid';
        const inputStatus = (normalizedOrder.status || '').toLowerCase();
        if (inputStatus === 'approved' || inputStatus === 'success' || inputStatus === 'paid') {
            utmifyStatus = 'paid';
        } else if (inputStatus === 'waiting_payment' || inputStatus === 'pending') {
            utmifyStatus = 'waiting_payment';
        } else if (inputStatus === 'refused' || inputStatus === 'failed') {
            utmifyStatus = 'refused';
        }

        // Amount calculation (always in cents for the commission block)
        const totalAmountCents = Math.round((normalizedOrder.amount || 0) * 100) || normalizedOrder.amountInCents || 0;

        // Products mapping with strict requirements: planId and planName
        const products = (normalizedOrder.products || []).map(p => {
            const priceCents = p.priceInCents || Math.round((p.price || 0) * 100);
            return {
                id: p.id?.toString() || '1',
                name: p.name || 'Produto',
                quantity: parseInt(p.quantity || 1),
                price: priceCents / 100, // Still sending float as backup
                priceInCents: priceCents,
                price_in_cents: priceCents,
                planId: p.id?.toString() || p.variant_id?.toString() || 'plan_1',
                planName: 'Plano Único'
            };
        });

        const payload = {
            orderId: normalizedOrder.orderId.toString(),
            platform: platform_name || normalizedOrder.platform || 'NovaPay',
            paymentMethod: normalizedOrder.paymentMethod || 'credit_card',
            status: utmifyStatus,
            createdAt: normalizedOrder.createdAt || nowIso,
            approvedDate: (utmifyStatus === 'paid') ? (normalizedOrder.approvedDate || nowIso) : null,
            customer: {
                name: normalizedOrder.customerName || 'Cliente',
                email: normalizedOrder.customerEmail || 'vazio@email.com',
                document: normalizedOrder.customerDocument || "00000000000",
                phone: normalizedOrder.customerPhone || '',
                country: normalizedOrder.countryCode || 'BR'
            },
            products: products,
            trackingParameters: normalizedOrder.trackingParameters || {
                src: '', utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', utm_term: ''
            },
            // CRITICAL: Schema validation requires this specific block
            commission: {
                totalPriceInCents: totalAmountCents,
                total_price_in_cents: totalAmountCents,
                gatewayFeeInCents: Math.round(totalAmountCents * 0.029),
                userCommissionInCents: Math.round(totalAmountCents * 0.971),
                currency: normalizedOrder.currency || 'USD'
            }
        };

        console.log(`[UTMify] Sending postback for order ${payload.orderId} (Status: ${utmifyStatus})...`);

        let fetchFn = typeof fetch === 'function' ? fetch : null;
        if (!fetchFn) {
            const nodeFetch = await import('node-fetch');
            fetchFn = nodeFetch.default;
        }

        // Endpoint confirmed by logs
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
            console.error(`[UTMify] Validation Error: ${response.status} - ${respText}`);
        } else {
            console.log(`[UTMify] Postback successful: ${respText}`);
        }
        return true;
    } catch (err) {
        console.error('[UTMify] Critical error in postback service:', err.message);
        return false;
    }
}

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

        const normalizedOrder = {
            orderId: order.id,
            platform: 'NovaPay',
            status: order.status === 'success' ? 'paid' : 'waiting_payment',
            amount: parseFloat(order.amount),
            currency: order.currency || 'USD',
            createdAt: order.created_at,
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            customerPhone: order.customer_phone,
            products: [{
                id: order.product_id,
                name: order.main_product_name,
                price: order.main_product_price,
                quantity: 1
            }],
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
