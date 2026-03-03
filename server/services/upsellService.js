import pool from '../db/pool.js';

export async function createUpsellSubscription({ order_id, upsell_product_id, billing_interval, trial_days }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Validate order and get customer details
        const orderRes = await client.query(`SELECT id, customer_email, product_id FROM orders WHERE id = $1`, [order_id]);
        if (orderRes.rowCount === 0) throw new Error('Order not found');
        const order = orderRes.rows[0];

        // 2. Validate upsell product
        const productRes = await client.query(`SELECT id, name FROM products WHERE id = $1`, [upsell_product_id]);
        if (productRes.rowCount === 0) throw new Error('Upsell product not found');

        // 3. (Mock) Communicate with Payment Gateway
        // Normally here you'd call Stripe/Paystack API:
        // const token = await gateway.createSubscription({ customerEmail: order.customer_email, plan: upsell_product_id, trial_days });
        const mockGatewayToken = `tok_recurring_${Math.random().toString(36).substr(2, 9)}`;
        const mockPlanId = `plan_${upsell_product_id.substr(0, 8)}`;

        // 4. Save Subscription in Neon
        const subRes = await client.query(
            `INSERT INTO subscriptions 
                (customer_email, order_id, product_id, upsell_origin_id, plan_id, status, billing_interval, subscription_token) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING *`,
            [
                order.customer_email,
                order.id,
                upsell_product_id,
                order.product_id,
                mockPlanId,
                'active',
                billing_interval || 'monthly',
                mockGatewayToken
            ]
        );

        await client.query('COMMIT');
        return subRes.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to create upsell subscription', error);
        throw error;
    } finally {
        client.release();
    }
}
