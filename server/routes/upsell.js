import { Router } from 'express';
import * as upsellController from '../controllers/upsellController.js';

const router = Router();

router.post('/subscribe', upsellController.subscribe);

export default router;
