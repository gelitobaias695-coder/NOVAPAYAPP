import * as productService from '../services/productService.js';
import pool from '../db/pool.js';

import { uploadBuffer } from '../services/cloudinaryService.js';

// Helper: upload to Cloudinary or falls back to data URI (base64)
async function saveImageToDb(productId, files, fieldName) {
    const file = files?.[fieldName]?.[0];
    if (!file || !file.buffer) return null;

    // Try Cloudinary first
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
        try {
            console.log(`[Images] Uploading ${fieldName} to Cloudinary...`);
            const url = await uploadBuffer(file.buffer, 'novapay/products');
            return url;
        } catch (err) {
            console.error(`[Images] Cloudinary upload failed for ${fieldName}:`, err.message);
            // Fallback to base64 ONLY if Cloudinary fails but we really need to save something
        }
    }

    // Fallback/Default: base64 (Note: this is what was causing performance issues)
    const base64 = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64}`;
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
            express_shipping_price: parseFloat(req.body.express_shipping_price || 0),
            standard_shipping_price: parseFloat(req.body.standard_shipping_price || 0),
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
            express_shipping_price: parseFloat(req.body.express_shipping_price || 0),
            standard_shipping_price: parseFloat(req.body.standard_shipping_price || 0),
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

export async function getCheckoutData(req, res, next) {
    try {
        const productId = req.params.id;
        
        // Fetch all data in parallel on the server (low latency connection to DB)
        const [product, bumps, funnel, platformResult, pixelResult] = await Promise.all([
            productService.getProductById(productId),
            productService.getProductBumps(productId).catch(() => []),
            pool.query('SELECT * FROM funnels WHERE main_product_id = $1 LIMIT 1', [productId]).then(r => r.rows[0] || null).catch(() => null),
            pool.query('SELECT favicon_url, logo_url, primary_color FROM platform_settings LIMIT 1').then(r => r.rows[0] || null).catch(() => null),
            pool.query('SELECT pixel_id FROM pixel_settings LIMIT 1').then(r => r.rows[0] || null).catch(() => null)
        ]);

        res.json({
            data: {
                product,
                bumps,
                funnel,
                settings: platformResult,
                pixel: pixelResult
            }
        });
    } catch (err) {
        next(err);
    }
}
