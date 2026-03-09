import pool from '../db/pool.js';

export async function createUpsellSubscription({
    order_id, upsell_product_id, billing_interval, trial_days,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, src
}) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Validate order and get customer details
        const orderRes = await client.query(`SELECT * FROM orders WHERE id = $1`, [order_id]);
        if (orderRes.rowCount === 0) throw new Error('Order not found');
        const parentOrder = orderRes.rows[0];

        // 2. Validate upsell product
        const productRes = await client.query(`SELECT * FROM products WHERE id = $1`, [upsell_product_id]);
        if (productRes.rowCount === 0) throw new Error('Upsell product not found');
        const product = productRes.rows[0];

        // 3. (Mock) Communicate with Payment Gateway
        const mockGatewayToken = `tok_sub_${Math.random().toString(36).substr(2, 9)}`;
        const mockPlanId = `plan_${upsell_product_id.substr(0, 8)}`;

        // 4. Create an ORDER record so it shows in sales and fires UTMify
        const upsellOrderRes = await client.query(
            `INSERT INTO orders 
                (product_id, customer_name, customer_email, customer_phone, 
                 country, city, province, postal_code, address, 
                 amount, currency, status, paystack_reference, 
                 checkout_language, checkout_type, parent_order_id,
                 utm_source, utm_medium, utm_campaign, utm_content, utm_term, src)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'success',$12,$13,'upsell',$14,$15,$16,$17,$18,$19,$20)
             RETURNING id`,
            [
                upsell_product_id,
                parentOrder.customer_name,
                parentOrder.customer_email,
                parentOrder.customer_phone || '',
                parentOrder.country || '',
                parentOrder.city || '',
                parentOrder.province || '',
                parentOrder.postal_code || '',
                parentOrder.address || '',
                parseFloat(product.price),
                product.currency,
                `sub_${mockGatewayToken}`,
                parentOrder.checkout_language || 'pt',
                order_id,
                utm_source || parentOrder.utm_source || null,
                utm_medium || parentOrder.utm_medium || null,
                utm_campaign || parentOrder.utm_campaign || null,
                utm_content || parentOrder.utm_content || null,
                utm_term || parentOrder.utm_term || null,
                src || parentOrder.src || null
            ]
        );
        const newOrderId = upsellOrderRes.rows[0].id;

        // 5. Save Subscription
        const subRes = await client.query(
            `INSERT INTO subscriptions 
                (customer_email, order_id, product_id, upsell_origin_id, plan_id, status, billing_interval, subscription_token) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING *`,
            [
                parentOrder.customer_email,
                newOrderId,
                upsell_product_id,
                parentOrder.product_id,
                mockPlanId,
                'active',
                billing_interval || 'monthly',
                mockGatewayToken
            ]
        );

        await client.query('COMMIT');

        // Trigger UTMify postback
        try {
            const utmifyService = await import('./utmifyService.js');
            await utmifyService.sendPostback(newOrderId);
        } catch (postErr) {
            console.error('[Subscription] UTMify postback error:', postErr.message);
        }

        return subRes.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to create upsell subscription', error);
        throw error;
    } finally {
        client.release();
    }
}
