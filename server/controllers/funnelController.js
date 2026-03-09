import * as funnelService from '../services/funnelService.js';

export async function getFunnels(req, res, next) {
    try {
        const funnels = await funnelService.listFunnels();
        res.json({ data: funnels, total: funnels.length });
    } catch (err) { next(err); }
}

export async function getFunnelById(req, res, next) {
    try {
        const funnel = await funnelService.getFunnelById(req.params.id);
        res.json({ data: funnel });
    } catch (err) { next(err); }
}

// GET /api/funnels/product/:productId — used by checkout page
export async function getFunnelByProduct(req, res, next) {
    try {
        const funnel = await funnelService.getFunnelByProductId(req.params.productId);
        res.json({ data: funnel });      // null if no funnel exists
    } catch (err) { next(err); }
}

export async function createFunnel(req, res, next) {
    try {
        const funnel = await funnelService.createFunnel(req.body);
        res.status(201).json({ data: funnel });
    } catch (err) { next(err); }
}

export async function updateFunnel(req, res, next) {
    try {
        const funnel = await funnelService.updateFunnel(req.params.id, req.body);
        res.json({ data: funnel });
    } catch (err) { next(err); }
}

export async function deleteFunnel(req, res, next) {
    try {
        await funnelService.deleteFunnel(req.params.id);
        res.status(204).end();
    } catch (err) { next(err); }
}

// POST /api/funnels/bump-log
export async function logBumpAction(req, res, next) {
    try {
        const { order_id, funnel_id, bump_id, product_id, ...rest } = req.body;

        // Sanitize UUID fields (empty string to null)
        const sanitized = {
            ...rest,
            order_id: (order_id && order_id !== '') ? order_id : null,
            funnel_id: (funnel_id && funnel_id !== '') ? funnel_id : null,
            bump_id: (bump_id && bump_id !== '') ? bump_id : null,
            product_id: (product_id && product_id !== '') ? product_id : null,
        };

        const log = await funnelService.logBumpAction(sanitized);
        res.status(201).json({ data: log });
    } catch (err) { next(err); }
}

// GET /api/funnels/:id/bump-analytics
export async function getBumpAnalytics(req, res, next) {
    try {
        const data = await funnelService.getBumpAnalytics(req.params.id);
        res.json({ data });
    } catch (err) { next(err); }
}
