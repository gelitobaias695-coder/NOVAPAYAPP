import express from 'express';
import * as e2paymentsController from '../controllers/e2paymentsController.js';

const router = express.Router();

// Public checkout routes
router.post('/initialize', e2paymentsController.initializePayment);

// Admin settings routes
router.get('/settings', e2paymentsController.getSettings);
router.put('/settings', e2paymentsController.saveSettings);

export default router;
