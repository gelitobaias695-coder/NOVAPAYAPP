import { z } from 'zod';
import * as orderRepository from '../repositories/orderRepository.js';
import * as productRepository from '../repositories/productRepository.js';

export const CreateOrderSchema = z.object({
    product_id: z.string().uuid('Invalid product ID'),
    customer_name: z.string().min(1, 'Name is required').max(255),
    customer_email: z.string().email('Invalid email format').optional().or(z.literal('')),
    customer_phone: z.string().max(50).optional().or(z.literal('')),
    country: z.string().max(100).optional().or(z.literal('')),
    address: z.string().max(500).optional().or(z.literal('')),
    city: z.string().max(100).optional().or(z.literal('')),
    postal_code: z.string().max(50).optional().or(z.literal('')),
    checkout_type: z.enum(['physical', 'digital']),
    status: z.enum(['pending', 'success', 'abandoned']).optional(),
    bump_products: z.array(z.string().uuid()).optional().default([]),
    src: z.string().optional(),
    client_ip_address: z.string().optional()
}).passthrough();

export async function createOrder(input) {
    const parsed = CreateOrderSchema.safeParse(input);

    if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        const err = new Error('Validation failed');
        err.statusCode = 422;
        err.errors = errors;
        throw err;
    }

    const orderData = parsed.data;

    // fetch product to get amount and currency dynamically and securely
    const product = await productRepository.findById(orderData.product_id);
    if (!product) {
        const err = new Error('Product not found');
        err.statusCode = 404;
        throw err;
    }

    // Calculate total amount securely in the backend
    let finalAmount = parseFloat(product.price);

    if (orderData.bump_products && orderData.bump_products.length > 0) {
        for (const bumpId of orderData.bump_products) {
            const bump = await productRepository.findById(bumpId);
            if (bump) finalAmount += parseFloat(bump.price);
        }
    }

    const newOrder = await orderRepository.create({
        ...orderData,
        amount: finalAmount,
        currency: product.currency,
        status: orderData.status ?? 'success' // Defaulting to success unless specified
    });

    return newOrder;
}

export async function updateOrder(id, input) {
    const parsed = CreateOrderSchema.safeParse(input);
    if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        const err = new Error('Validation failed');
        err.statusCode = 422;
        err.errors = errors;
        throw err;
    }
    const orderData = parsed.data;

    const product = await productRepository.findById(orderData.product_id);
    if (!product) {
        const err = new Error('Product not found');
        err.statusCode = 404;
        throw err;
    }

    let finalAmount = parseFloat(product.price);

    if (orderData.bump_products && orderData.bump_products.length > 0) {
        for (const bumpId of orderData.bump_products) {
            const bump = await productRepository.findById(bumpId);
            if (bump) finalAmount += parseFloat(bump.price);
        }
    }

    const updatedOrder = await orderRepository.update(id, {
        ...orderData,
        amount: finalAmount,
        currency: product.currency,
        status: orderData.status ?? 'success'
    });

    if (!updatedOrder) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
    }

    return updatedOrder;
}

export async function listOrders(filter, startDate, endDate) {
    return orderRepository.findAll(filter, startDate, endDate);
}

export async function getDashboardStats(filter, startDate, endDate) {
    return orderRepository.getDashboardStats(filter, startDate, endDate);
}

export async function getAnalytics() {
    return orderRepository.getAnalytics();
}
export async function getOrderById(id) {
    return orderRepository.findById(id);
}
