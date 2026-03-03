import { Router } from 'express';
import * as paystackController from '../controllers/paystackController.js';

const router = Router();

// Payment flows
router.post('/initialize', paystackController.initializePayment);
router.post('/upsell-charge', paystackController.upsellCharge);

// Gateway settings (Dashboard UI)
router.get('/settings', paystackController.getSettings);
router.put('/settings', paystackController.saveSettings);

export default router;
