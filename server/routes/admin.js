import { Router } from 'express';
import * as paystackService from '../services/paystackService.js';
import pool from '../db/pool.js';

const router = Router();

// POST /api/admin/force-success/:orderId
// Force-marks an order as success and fires UTMify + email
router.post('/force-success/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const result = await paystackService.forceOrderSuccess(orderId);
        res.json({ ok: true, message: 'Order processed successfully', orderId });
    } catch (err) {
        console.error('[Admin] force-success error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/force-success-latest
// Force-marks the latest PENDING order as success
router.post('/force-success-latest', async (req, res) => {
    try {
        const latest = await pool.query(
            `SELECT id FROM orders WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1`
        );
        if (latest.rowCount === 0) {
            return res.status(404).json({ error: 'No pending orders found' });
        }
        const orderId = latest.rows[0].id;
        const result = await paystackService.forceOrderSuccess(orderId);
        res.json({ ok: true, message: 'Latest pending order processed', orderId });
    } catch (err) {
        console.error('[Admin] force-success-latest error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/pending-orders
// List last 10 pending orders
router.get('/pending-orders', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, customer_name, customer_email, amount, currency, status, paystack_reference, created_at
             FROM orders WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10`
        );
        res.json({ data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
