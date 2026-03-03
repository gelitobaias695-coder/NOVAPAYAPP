import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import {
    getProducts, getProductById, addProduct, updateProduct, deleteProduct,
    getProductBumps, addProductBump, removeProductBump, syncProductBumps
} from '../controllers/productController.js';

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        const uniqueSuffix = crypto.randomUUID();
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    }
});
const upload = multer({ storage });

const router = Router();

router.get('/', getProducts);
router.get('/:id/bumps', getProductBumps);
router.post('/:id/bumps', addProductBump);
router.put('/:id/bumps/sync', syncProductBumps);          // SYNC: clear + reinsert all bumps atomically
router.delete('/:id/bumps/:bumpProductId', removeProductBump);
router.get('/:id', getProductById);
router.post('/', upload.fields([{ name: 'logo_image', maxCount: 1 }, { name: 'product_image', maxCount: 1 }]), addProduct);
router.put('/:id', upload.fields([{ name: 'logo_image', maxCount: 1 }, { name: 'product_image', maxCount: 1 }]), updateProduct);
router.delete('/:id', deleteProduct);

export default router;
