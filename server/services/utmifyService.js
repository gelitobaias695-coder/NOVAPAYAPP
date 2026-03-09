import pool from '../db/pool.js';

export async function sendUtmifyOrder(normalizedOrder) {
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

        const nowIso = new Date().toISOString();

        // Currency and Conversion handling (MANDATORY for UTMify)
        const allowedCurrencies = ["BRL", "USD", "EUR", "GBP", "ARS", "CAD", "COP", "MXN", "PYG", "CLP", "PEN", "PLN", "UAH", "CHF", "THB", "AUD"];
        const rawCurrency = (normalizedOrder.currency || 'USD').toUpperCase().trim();
        let baseCurrency = rawCurrency;
        let conversionRate = 1;

        if (baseCurrency === 'KSH') baseCurrency = 'KES';
        if (baseCurrency === 'MT') baseCurrency = 'MZN';

        if (!allowedCurrencies.includes(baseCurrency)) {
            if (baseCurrency === 'ZAR') conversionRate = 19;
            else if (baseCurrency === 'KES') conversionRate = 130;
            else if (baseCurrency === 'MZN') conversionRate = 64;
            else if (baseCurrency === 'AOA') conversionRate = 830;
            else if (baseCurrency === 'NGN') conversionRate = 1500;
            else if (baseCurrency === 'GHS') conversionRate = 12;
            else conversionRate = 1;
            baseCurrency = 'USD';
        }

        const toCents = (val) => Math.round((parseFloat(val || 0) / conversionRate) * 100);

        // Use normalized amount or calculate from float
        let totalCents = normalizedOrder.amountInCents || Math.round((normalizedOrder.amount || 0) * 100);

        // If we converted currency, we need to adjust the cents
        if (conversionRate !== 1 && normalizedOrder.currency !== baseCurrency) {
            totalCents = toCents(totalCents / 100);
        }

        const payload = {
            platform: platform_name || normalizedOrder.platform || 'NovaPay',
            orderId: normalizedOrder.orderId.toString(),
            paymentMethod: normalizedOrder.paymentMethod || 'credit_card',
            status: normalizedOrder.status || 'approved',
            createdAt: normalizedOrder.createdAt || nowIso,
            approvedDate: (normalizedOrder.status === 'approved' || normalizedOrder.status === 'paid') ? (normalizedOrder.approvedDate || nowIso) : null,
            customer: {
                name: normalizedOrder.customerName || 'Cliente',
                email: normalizedOrder.customerEmail || 'vazio@email.com',
                document: normalizedOrder.customerDocument || "00000000000",
                phone: normalizedOrder.customerPhone || '',
                country: normalizedOrder.countryCode || 'BR',
                city: normalizedOrder.city || '',
                state: normalizedOrder.state || '',
                zipCode: normalizedOrder.zipCode || '',
                ip: normalizedOrder.ip || '127.0.0.1'
            },
            products: (normalizedOrder.products || []).map(p => ({
                id: p.id,
                name: p.name,
                priceInCents: conversionRate !== 1 ? toCents((p.priceInCents || 0) / 100) : (p.priceInCents || 0),
                price_in_cents: conversionRate !== 1 ? toCents((p.priceInCents || 0) / 100) : (p.price_in_cents || p.priceInCents || 0),
                quantity: p.quantity || 1
            })),
            trackingParameters: normalizedOrder.trackingParameters || {
                src: '', utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', utm_term: ''
            },
            commission: {
                totalPriceInCents: totalCents,
                total_price_in_cents: totalCents,
                gatewayFeeInCents: Math.round(totalCents * 0.029),
                userCommissionInCents: Math.round(totalCents * 0.971),
                currency: baseCurrency
            }
        };

        console.log(`[UTMify] Sending postback for order ${payload.orderId} (${normalizedOrder.currency} -> ${baseCurrency})...`);

        let fetchFn = typeof fetch === 'function' ? fetch : null;
        if (!fetchFn) {
            const nodeFetch = await import('node-fetch');
            fetchFn = nodeFetch.default;
        }

        const response = await fetchFn('https://api.utmify.com.br/api/orders', {
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
        // 1. Get Order and Product details
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

        // Currency and Conversion handling
        const allowedCurrencies = ["BRL", "USD", "EUR", "GBP", "ARS", "CAD", "COP", "MXN", "PYG", "CLP", "PEN", "PLN", "UAH", "CHF", "THB", "AUD"];
        const rawCurrency = (order.currency || 'USD').toUpperCase().trim();
        let baseCurrency = rawCurrency;
        let conversionRate = 1;

        if (baseCurrency === 'KSH') baseCurrency = 'KES';
        if (baseCurrency === 'MT') baseCurrency = 'MZN';

        if (!allowedCurrencies.includes(baseCurrency)) {
            if (baseCurrency === 'ZAR') conversionRate = 19;
            else if (baseCurrency === 'KES') conversionRate = 130;
            else if (baseCurrency === 'MZN') conversionRate = 64;
            else if (baseCurrency === 'AOA') conversionRate = 830;
            else if (baseCurrency === 'NGN') conversionRate = 1500;
            else if (baseCurrency === 'GHS') conversionRate = 12;
            baseCurrency = 'USD';
        }

        const toCents = (val) => Math.round((parseFloat(val || 0) / conversionRate) * 100);

        const products = [{
            id: order.product_id,
            name: order.main_product_name || 'Produto Principal',
            planId: order.product_id,
            planName: 'Único',
            priceInCents: toCents(order.main_product_price),
            price_in_cents: toCents(order.main_product_price),
            quantity: 1
        }];

        if (order.bump_products && order.bump_products.length > 0) {
            const bumpsRes = await pool.query(`SELECT id, name, price FROM products WHERE id = ANY($1)`, [order.bump_products]);
            for (const bump of bumpsRes.rows) {
                products.push({
                    id: bump.id,
                    name: bump.name,
                    planId: bump.id,
                    planName: 'Order Bump',
                    priceInCents: toCents(bump.price),
                    price_in_cents: toCents(bump.price),
                    quantity: 1
                });
            }
        }

        // Country code
        let countryCode = 'BR';
        const rawCountry = (order.country || '').toUpperCase();
        if (rawCountry.includes('MOZAMBIQUE') || rawCountry.includes('MOÇAMBIQUE')) countryCode = 'MZ';
        else if (rawCountry.includes('SOUTH AFRICA')) countryCode = 'ZA';
        else if (rawCountry.includes('ANGOLA')) countryCode = 'AO';
        else if (rawCountry.includes('PORTUGAL')) countryCode = 'PT';
        else if (rawCountry.includes('BRAZIL') || rawCountry.includes('BRASIL')) countryCode = 'BR';
        else if (rawCountry.includes('UNITED STATES')) countryCode = 'US';
        else if (rawCountry.length === 2) countryCode = rawCountry;

        const normalizedOrder = {
            orderId: order.id,
            amountInCents: toCents(order.amount),
            currency: baseCurrency,
            status: order.status === 'success' ? 'approved' : 'waiting_payment',
            createdAt: order.created_at ? new Date(order.created_at).toISOString() : new Date().toISOString(),
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            customerPhone: order.customer_phone,
            countryCode,
            city: order.city,
            state: order.province,
            zipCode: order.postal_code,
            products,
            trackingParameters: {
                src: order.src || order.utm_source || '',
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
