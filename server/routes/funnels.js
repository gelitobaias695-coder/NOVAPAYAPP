import { Router } from 'express';
import * as funnelController from '../controllers/funnelController.js';

const router = Router();

router.get('/', funnelController.getFunnels);
router.get('/product/:productId', funnelController.getFunnelByProduct);   // NEW
router.post('/bump-log', funnelController.logBumpAction);         // NEW
router.get('/:id', funnelController.getFunnelById);
router.get('/:id/bump-analytics', funnelController.getBumpAnalytics);      // NEW
router.post('/', funnelController.createFunnel);
router.put('/:id', funnelController.updateFunnel);
router.delete('/:id', funnelController.deleteFunnel);

export default router;
