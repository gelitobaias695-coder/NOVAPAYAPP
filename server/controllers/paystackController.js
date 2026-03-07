import * as paystackService from '../services/paystackService.js';

// POST /api/paystack/initialize
export async function initializePayment(req, res, next) {
    try {
        const { order_id, email, callback_url } = req.body;
        if (!order_id) return res.status(400).json({ error: 'order_id is required' });
        const data = await paystackService.initializePayment({ order_id, email, callback_url });
        res.status(200).json({ data });
    } catch (err) { next(err); }
}

// POST /api/paystack/upsell-charge
export async function upsellCharge(req, res, next) {
    try {
        const { order_id, upsell_product_id, email } = req.body;
        if (!order_id || !upsell_product_id) {
            return res.status(400).json({ error: 'order_id and upsell_product_id are required' });
        }
        const data = await paystackService.chargeUpsell({ order_id, upsell_product_id, email });
        res.status(200).json({ data });
    } catch (err) { next(err); }
}

// POST /api/webhooks/paystack  (unified webhook)
export async function handleWebhook(req, res) {
    const signature = req.headers['x-paystack-signature'];
    // Always respond 200 immediately to avoid Paystack retries
    res.sendStatus(200);
    if (!signature || !req.body) return;
    try {
        await paystackService.handleWebhook(req.body, signature, req.rawBody);
    } catch (err) {
        console.error('[Webhook] Processing error:', err.message);
    }
}

// GET /api/paystack/settings
export async function getSettings(req, res, next) {
    try {
        const data = await paystackService.getSettings();
        res.json({ data });
    } catch (err) { next(err); }
}

// PUT /api/paystack/settings
export async function saveSettings(req, res, next) {
    try {
        const { secret_key, public_key, webhook_secret, is_live, test_secret_key, test_public_key } = req.body;
        const data = await paystackService.saveSettings({ secret_key, public_key, webhook_secret, is_live, test_secret_key, test_public_key });
        res.json({ data, message: 'Configurações salvas com sucesso no Neon!' });
    } catch (err) { next(err); }
}
