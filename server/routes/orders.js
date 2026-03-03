import { Router } from 'express';
import { createOrder, getOrders, getStats, updateOrder, getAnalytics, getOrderById } from '../controllers/orderController.js';

const router = Router();

router.get('/analytics', getAnalytics);
router.get('/stats', getStats);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.put('/:id', updateOrder);

export default router;
