import * as upsellService from '../services/upsellService.js';

export async function subscribe(req, res, next) {
    try {
        const { order_id, upsell_product_id, billing_interval, trial_days } = req.body;

        if (!order_id || !upsell_product_id) {
            return res.status(400).json({ error: 'order_id and upsell_product_id are required' });
        }

        const subscription = await upsellService.createUpsellSubscription({
            order_id,
            upsell_product_id,
            billing_interval,
            trial_days
        });

        res.status(201).json({ data: subscription });
    } catch (err) {
        next(err);
    }
}
