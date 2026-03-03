import express from 'express';
import { getPixelSettings, updatePixelSettings } from '../controllers/pixelController.js';

const router = express.Router();

router.get('/settings', getPixelSettings);
router.put('/settings', updatePixelSettings);

export default router;
