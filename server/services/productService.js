import { z } from 'zod';
import * as productRepository from '../repositories/productRepository.js';
import { getIsLiveMode } from './gatewaySettingsService.js';

export const CreateProductSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().max(2000).optional().default(''),
    price: z
        .number({ invalid_type_error: 'Price must be a number' })
        .positive('Price must be greater than 0')
        .multipleOf(0.01),
    currency: z.enum(['ZAR', 'KES', 'TZS', 'NGN', 'GHS', 'MZN'], {
        errorMap: () => ({ message: 'Currency must be ZAR, KES, TZS, NGN, GHS or MZN' }),
    }),
    status: z.enum(['active', 'inactive']).default('active'),
    type: z.enum(['physical', 'digital']).default('physical'),
    logo_url: z.string().optional().or(z.literal('')),
    product_image_url: z.string().optional().or(z.literal('')),
    primary_color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
        .default('#10B981'),
    require_whatsapp: z.boolean().default(false),
    checkout_language: z.enum(['pt', 'en', 'fr', 'es']).default('pt'),
    success_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
    email_sender_name: z.string().max(255).optional().or(z.literal('')),
    email_sender_email: z.string().email('Invalid sender email format').optional().or(z.literal('')),
    is_live: z.boolean().optional(),
    express_shipping_price: z.number().nonnegative().optional().default(0),
    standard_shipping_price: z.number().nonnegative().optional().default(0),
    payment_gateway: z.enum(['paystack', 'e2payments']).default('paystack'),
});

export async function listProducts() {
    return productRepository.findAll();
}

export async function getProductById(id) {
    const product = await productRepository.findById(id);
    if (!product) {
        const err = new Error('Product not found');
        err.statusCode = 404;
        throw err;
    }
    return product;
}

export async function createProduct(input) {
    const parsed = CreateProductSchema.safeParse(input);

    if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        const err = new Error('Validation failed');
        err.statusCode = 422;
        err.errors = errors;
        throw err;
    }

    const data = parsed.data;
    if (data.is_live === undefined) {
        data.is_live = await getIsLiveMode();
    }

    return productRepository.create(data);
}

export async function updateProduct(id, input) {
    const parsed = CreateProductSchema.safeParse(input);

    if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        const err = new Error('Validation failed');
        err.statusCode = 422;
        err.errors = errors;
        throw err;
    }

    // Ensure the product exists
    await getProductById(id);

    return productRepository.update(id, parsed.data);
}

export async function deleteProduct(id) {
    // Ensure the product exists
    await getProductById(id);

    return productRepository.remove(id);
}

// ─── Product Order Bumps ──────────────────────────────────────────────────────

export async function getProductBumps(mainProductId) {
    // Ensure the main product exists
    await getProductById(mainProductId);
    return productRepository.findBumpsByProductId(mainProductId);
}

export async function addProductBump(mainProductId, body) {
    const { bump_product_id, title, description, discount_type, discount_value, display_order } = body;
    if (!bump_product_id) {
        const err = new Error('bump_product_id is required');
        err.statusCode = 422;
        throw err;
    }
    // Validate both products exist
    await getProductById(mainProductId);
    await getProductById(bump_product_id);

    return productRepository.addBumpToProduct(mainProductId, bump_product_id, {
        title: title || 'Oferta Exclusiva',
        description: description || '',
        discount_type: discount_type || 'percentage',
        discount_value: parseFloat(discount_value) || 0,
        display_order: parseInt(display_order) || 0,
    });
}

export async function removeProductBump(mainProductId, bumpProductId) {
    return productRepository.removeBumpFromProduct(mainProductId, bumpProductId);
}

/**
 * SYNC: atomically replaces ALL bump relations for a product.
 * @param {string} mainProductId
 * @param {Array} bumps - [{ bump_product_id, title, description, discount_type, discount_value }]
 */
export async function syncProductBumps(mainProductId, bumps = []) {
    await getProductById(mainProductId); // ensure product exists
    return productRepository.syncBumpsForProduct(mainProductId, bumps);
}

