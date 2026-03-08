import * as productService from '../services/productService.js';
import pool from '../db/pool.js';

// Helper: convert file buffer to base64 data URL and store in DB column
async function saveImageToDb(productId, files, fieldName, column) {
    const file = files?.[fieldName]?.[0];
    if (!file || !file.buffer) return null;
    const base64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;
    return dataUrl;
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

        // Convert uploaded images to base64 data URLs
        const logoData = await saveImageToDb(null, req.files, 'logo_image', 'logo_data');
        const productImageData = await saveImageToDb(null, req.files, 'product_image', 'product_image_data');

        if (logoData) {
            input.logo_url = logoData;
            input.logo_data = logoData;
        }
        if (productImageData) {
            input.product_image_url = productImageData;
            input.product_image_data = productImageData;
        }

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

        const logoData = await saveImageToDb(null, req.files, 'logo_image', 'logo_data');
        const productImageData = await saveImageToDb(null, req.files, 'product_image', 'product_image_data');

        if (logoData) {
            input.logo_url = logoData;
            input.logo_data = logoData;
        }
        if (productImageData) {
            input.product_image_url = productImageData;
            input.product_image_data = productImageData;
        }

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
