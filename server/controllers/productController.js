import * as productService from '../services/productService.js';

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

        const baseUrl = process.env.VITE_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3001';
        const isProdAndNotLocal = process.env.NODE_ENV === 'production' && !baseUrl.includes('localhost');

        if (req.files?.logo_image?.[0]) {
            const fileUrl = `/uploads/${req.files.logo_image[0].filename}`;
            input.logo_url = isProdAndNotLocal ? `${baseUrl}${fileUrl}` : `http://localhost:3001${fileUrl}`;
        }
        if (req.files?.product_image?.[0]) {
            const fileUrl = `/uploads/${req.files.product_image[0].filename}`;
            input.product_image_url = isProdAndNotLocal ? `${baseUrl}${fileUrl}` : `http://localhost:3001${fileUrl}`;
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

        const baseUrl = process.env.VITE_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3001';
        const isProdAndNotLocal = process.env.NODE_ENV === 'production' && !baseUrl.includes('localhost');

        if (req.files?.logo_image?.[0]) {
            const fileUrl = `/uploads/${req.files.logo_image[0].filename}`;
            input.logo_url = isProdAndNotLocal ? `${baseUrl}${fileUrl}` : `http://localhost:3001${fileUrl}`;
        }
        if (req.files?.product_image?.[0]) {
            const fileUrl = `/uploads/${req.files.product_image[0].filename}`;
            input.product_image_url = isProdAndNotLocal ? `${baseUrl}${fileUrl}` : `http://localhost:3001${fileUrl}`;
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

// ─── Product Order Bumps ───────────────────────────────────────────────────────────────

/** GET /api/products/:id/bumps */
export async function getProductBumps(req, res, next) {
    try {
        const bumps = await productService.getProductBumps(req.params.id);
        console.log('[API] Bumps encontrados:', bumps);
        res.json({ data: bumps, total: bumps.length });
    } catch (err) {
        next(err);
    }
}

/** POST /api/products/:id/bumps  body: { bump_product_id, title, discount_type, discount_value } */
export async function addProductBump(req, res, next) {
    try {
        const bump = await productService.addProductBump(req.params.id, req.body);
        res.status(201).json({ data: bump });
    } catch (err) {
        next(err);
    }
}

/** DELETE /api/products/:id/bumps/:bumpProductId */
export async function removeProductBump(req, res, next) {
    try {
        await productService.removeProductBump(req.params.id, req.params.bumpProductId);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
}

/**
 * PUT /api/products/:id/bumps/sync
 * body: { bumps: [{ bump_product_id, title, description, discount_type, discount_value }] }
 * Atomically replaces ALL bump relations for the product (clear + reinsert).
 */
export async function syncProductBumps(req, res, next) {
    try {
        const bumps = Array.isArray(req.body.bumps) ? req.body.bumps : [];
        console.log(`[API SYNC] Produto ${req.params.id}: recebendo ${bumps.length} bump(s) para sincronizar no Neon.`);
        const result = await productService.syncProductBumps(req.params.id, bumps);
        console.log(`[API SYNC] Produto ${req.params.id}: sync concluído — ${result.length} bump(s) confirmados no Neon.`);
        res.json({ data: result, total: result.length, message: `Configurações de funil atualizadas com sucesso no banco de dados. ${result.length} bump(s) ativo(s) no Neon.` });
    } catch (err) {
        next(err);
    }
}
