import * as e2pService from '../services/e2paymentsService.js';

export async function getSettings(req, res, next) {
    try {
        const data = await e2pService.getSettings();
        res.json({ data });
    } catch (err) { next(err); }
}

export async function saveSettings(req, res, next) {
    try {
        const data = await e2pService.saveSettings(req.body);
        res.json({ data, message: 'E2Payments Configurações salvas com sucesso no Neon!' });
    } catch (err) { next(err); }
}

export async function initializePayment(req, res, next) {
    try {
        const { order_id, phone, network, amount } = req.body;
        if (!order_id || !phone || !network) return res.status(400).json({ error: 'order_id, phone, and network are required' });
        const data = await e2pService.initializePayment({ order_id, phone, network, amount });
        res.status(200).json({ data });
    } catch (err) { next(err); }
}

export async function handleWebhook(req, res) {
    res.sendStatus(200); // Always respond 200 ok to webhook immediately
    if (!req.body) return;
    try {
        await e2pService.handleWebhook(req.body);
    } catch (err) {
        console.error('[E2Payments Webhook] Processing error:', err.message);
    }
}
