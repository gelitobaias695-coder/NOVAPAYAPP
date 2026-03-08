import { Router } from 'express';
import multer from 'multer';
import {
    getProducts, getProductById, addProduct, updateProduct, deleteProduct,
    getProductBumps, addProductBump, removeProductBump, syncProductBumps
} from '../controllers/productController.js';

// Use memory storage — files go to Cloudinary, NOT to disk
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

const router = Router();

router.get('/', getProducts);
router.get('/:id/bumps', getProductBumps);
router.post('/:id/bumps', addProductBump);
router.put('/:id/bumps/sync', syncProductBumps);
router.delete('/:id/bumps/:bumpProductId', removeProductBump);
router.get('/:id', getProductById);
router.post('/', upload.fields([{ name: 'logo_image', maxCount: 1 }, { name: 'product_image', maxCount: 1 }]), addProduct);
router.put('/:id', upload.fields([{ name: 'logo_image', maxCount: 1 }, { name: 'product_image', maxCount: 1 }]), updateProduct);
router.delete('/:id', deleteProduct);

export default router;
