import { Router } from 'express';
import * as paystackController from '../controllers/paystackController.js';

const router = Router();

// Unified Paystack webhook — POST /api/webhooks/paystack
router.post('/paystack', paystackController.handleWebhook);

export default router;
