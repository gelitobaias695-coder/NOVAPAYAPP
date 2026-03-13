import { Router } from 'express';
import * as paystackController from '../controllers/paystackController.js';
import * as shopifyController from '../controllers/shopifyController.js';
import * as e2paymentsController from '../controllers/e2paymentsController.js';

const router = Router();

// Unified Paystack webhook — POST /api/webhooks/paystack
router.post('/paystack', paystackController.handleWebhook);

// Shopify webhook — POST /api/webhooks/shopify
router.post('/shopify', shopifyController.handleWebhook);

// E2Payments webhook — POST /api/webhooks/e2payments
router.post('/e2payments', e2paymentsController.handleWebhook);

export default router;
