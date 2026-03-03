import { z } from 'zod';
import * as funnelRepository from '../repositories/funnelRepository.js';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const optionalUuid = z.union([z.string().uuid(), z.literal(''), z.null()])
    .optional().transform(v => (v === '' ? null : v));

const coercedNumber = (min = 0, def = 0) =>
    z.union([z.number(), z.string()])
        .transform(v => (typeof v === 'string' ? parseFloat(v) || def : v))
        .pipe(z.number().min(min).default(def));

const OrderBumpItemSchema = z.object({
    id: z.string().uuid().optional(),    // existing bump id (for updates)
    product_id: optionalUuid,
    title: z.string().max(255).optional().default('Oferta Especial'),
    description: z.string().optional().default(''),
    discount_type: z.enum(['percentage', 'fixed']).default('percentage'),
    discount_value: coercedNumber(0, 0),
    enabled: z.boolean().default(true),
    display_order: z.number().int().optional().default(0),
});

const UpsellItemSchema = z.object({
    product_id: optionalUuid,
    is_recurring: z.boolean().default(false),
    billing_cycle: z.enum(['weekly', 'monthly', 'yearly']).optional().nullable(),
    price_override: z.union([z.number(), z.string(), z.null()])
        .transform(v => {
            if (!v && v !== 0) return null;
            const n = typeof v === 'string' ? parseFloat(v) : v;
            return isNaN(n) ? null : n;
        }).pipe(z.number().min(0).optional().nullable()),
    upsell_page_url: z.string().url().optional().nullable().or(z.literal('')).transform(v => v || null),
    display_order: z.number().int().optional().default(0),
});

const DownsellItemSchema = z.object({
    product_id: optionalUuid,
    discount: coercedNumber(0, 0),
    downsell_page_url: z.string().url().optional().nullable().or(z.literal('')).transform(v => v || null),
    display_order: z.number().int().optional().default(0),
});

// Legacy single-item wrappers (kept for backward compat from frontend)
const LegacyBumpSchema = OrderBumpItemSchema.extend({ enabled: z.boolean().default(false) }).optional();
const LegacyUpsellSchema = UpsellItemSchema.extend({ enabled: z.boolean().default(false) }).optional();
const LegacyDownsellSchema = DownsellItemSchema.extend({ enabled: z.boolean().default(false) }).optional();

export const FunnelSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').max(255),
    main_product_id: z.string().uuid('Selecione um produto principal válido'),
    redirect_url: z.string().url().optional().nullable().or(z.literal('')).transform(v => v || null),
    // Multi-item arrays (preferred)
    order_bumps: z.array(OrderBumpItemSchema).optional().default([]),
    upsells: z.array(UpsellItemSchema).optional().default([]),
    downsells: z.array(DownsellItemSchema).optional().default([]),
    // Legacy single-item (backward compat)
    order_bump: LegacyBumpSchema,
    upsell: LegacyUpsellSchema,
    downsell: LegacyDownsellSchema,
});

const BumpLogSchema = z.object({
    order_id: z.string().uuid().optional().nullable(),
    funnel_id: z.string().uuid().optional().nullable(),
    bump_id: z.string().uuid().optional().nullable(),
    product_id: z.string().uuid().optional().nullable(),
    action: z.enum(['viewed', 'clicked', 'accepted', 'declined']).default('clicked'),
    extra_revenue: z.number().min(0).optional().default(0),
});

function throwValidation(errors) {
    const err = new Error('Validation failed');
    err.statusCode = 422;
    err.errors = errors;
    throw err;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function listFunnels() {
    return funnelRepository.findAll();
}

export async function getFunnelById(id) {
    const funnel = await funnelRepository.findById(id);
    if (!funnel) {
        const err = new Error('Funnel not found');
        err.statusCode = 404;
        throw err;
    }
    return funnel;
}

export async function getFunnelByProductId(productId) {
    return funnelRepository.findByProductId(productId);
}

export async function createFunnel(input) {
    const parsed = FunnelSchema.safeParse(input);
    if (!parsed.success) throwValidation(parsed.error.flatten().fieldErrors);
    return funnelRepository.create(parsed.data);
}

export async function updateFunnel(id, input) {
    const parsed = FunnelSchema.safeParse(input);
    if (!parsed.success) throwValidation(parsed.error.flatten().fieldErrors);
    await getFunnelById(id);
    return funnelRepository.update(id, parsed.data);
}

export async function deleteFunnel(id) {
    await getFunnelById(id);
    return funnelRepository.remove(id);
}

// ─── Bump Analytics ───────────────────────────────────────────────────────────

export async function logBumpAction(input) {
    const parsed = BumpLogSchema.safeParse(input);
    if (!parsed.success) throwValidation(parsed.error.flatten().fieldErrors);
    return funnelRepository.logBumpAction(parsed.data);
}

export async function getBumpAnalytics(funnelId) {
    return funnelRepository.getBumpAnalytics(funnelId);
}
