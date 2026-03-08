import * as productService from '../services/productService.js';
import { uploadBuffer } from '../services/cloudinaryService.js';

// Helper: upload a file from req.files to Cloudinary, return secure_url or null
async function uploadIfPresent(files, fieldName) {
    const file = files?.[fieldName]?.[0];
    if (!file) return null;
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
        // No Cloudinary configured — fallback to old local disk behaviour via buffer won't work
        // Just skip and return null; user must configure Cloudinary
        console.warn('[Upload] CLOUDINARY_CLOUD_NAME not set — image upload skipped');
        return null;
    }
    try {
        const url = await uploadBuffer(file.buffer, 'novapay/products');
        console.log(`[Cloudinary] Uploaded ${fieldName}: ${url}`);
        return url;
    } catch (err) {
        console.error(`[Cloudinary] Upload failed for ${fieldName}:`, err.message);
        return null;
    }
}

export async function getProducts(req, res, next) {
    try {
        const products = await productService.listProducts();
        res.json({ data: products, total: products.length });
    } catch (err) {
        next(err);
    }
}

export async function getProductById(req, res, next) {
    try {
        const product = await productService.getProductById(req.params.id);
        res.json({ data: product });
    } catch (err) {
        next(err);
    }
}

export async function addProduct(req, res, next) {
    try {
        const input = {
            ...req.body,
            price: parseFloat(req.body.price),
            require_whatsapp: req.body.require_whatsapp === true || req.body.require_whatsapp === 'true',
        };

        const logoUrl = await uploadIfPresent(req.files, 'logo_image');
        const productImageUrl = await uploadIfPresent(req.files, 'product_image');

        if (logoUrl) input.logo_url = logoUrl;
        if (productImageUrl) input.product_image_url = productImageUrl;

        const product = await productService.createProduct(input);
        res.status(201).json({ data: product });
    } catch (err) {
        next(err);
    }
}

export async function updateProduct(req, res, next) {
    try {
        const input = {
            ...req.body,
            price: parseFloat(req.body.price),
            require_whatsapp: req.body.require_whatsapp === true || req.body.require_whatsapp === 'true',
        };

        const logoUrl = await uploadIfPresent(req.files, 'logo_image');
        const productImageUrl = await uploadIfPresent(req.files, 'product_image');

        if (logoUrl) input.logo_url = logoUrl;
        if (productImageUrl) input.product_image_url = productImageUrl;

        const product = await productService.updateProduct(req.params.id, input);
        res.status(200).json({ data: product });
    } catch (err) {
        next(err);
    }
}

export async function deleteProduct(req, res, next) {
    try {
        await productService.deleteProduct(req.params.id);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
}

// ─── Product Order Bumps ───────────────────────────────────────────────────────

export async function getProductBumps(req, res, next) {
    try {
        const bumps = await productService.getProductBumps(req.params.id);
        res.json({ data: bumps, total: bumps.length });
    } catch (err) {
        next(err);
    }
}

export async function addProductBump(req, res, next) {
    try {
        const bump = await productService.addProductBump(req.params.id, req.body);
        res.status(201).json({ data: bump });
    } catch (err) {
        next(err);
    }
}

export async function removeProductBump(req, res, next) {
    try {
        await productService.removeProductBump(req.params.id, req.params.bumpProductId);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
}

export async function syncProductBumps(req, res, next) {
    try {
        const bumps = Array.isArray(req.body.bumps) ? req.body.bumps : [];
        const result = await productService.syncProductBumps(req.params.id, bumps);
        res.json({ data: result, total: result.length, message: `${result.length} bump(s) sincronizado(s) com sucesso.` });
    } catch (err) {
        next(err);
    }
}
