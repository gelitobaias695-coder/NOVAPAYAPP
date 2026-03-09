import { Router } from 'express';
import * as paystackController from '../controllers/paystackController.js';
import * as shopifyController from '../controllers/shopifyController.js';

const router = Router();

// Unified Paystack webhook — POST /api/webhooks/paystack
router.post('/paystack', paystackController.handleWebhook);

// Shopify webhook — POST /api/webhooks/shopify
router.post('/shopify', shopifyController.handleWebhook);

export default router;
