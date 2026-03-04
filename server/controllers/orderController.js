import * as orderService from '../services/orderService.js';
import { sendFacebookServerEvent } from '../services/facebookService.js';

export async function createOrder(req, res, next) {
    try {
        const orderData = { ...req.body };
        const forwarded = req.headers['x-forwarded-for'];
        const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
        orderData.client_ip_address = ip ? ip.substring(0, 45) : null;

        const order = await orderService.createOrder(orderData);

        // Dispara InitiateCheckout Server-side
        sendFacebookServerEvent('InitiateCheckout', order).catch(e => console.error(e));

        res.status(201).json({ data: order });
    } catch (err) {
        next(err);
    }
}

export async function updateOrder(req, res, next) {
    try {
        const orderData = { ...req.body };
        if (!orderData.client_ip_address) {
            const forwarded = req.headers['x-forwarded-for'];
            const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
            orderData.client_ip_address = ip ? ip.substring(0, 45) : null;
        }

        const order = await orderService.updateOrder(req.params.id, orderData);

        if (orderData.bump_products && orderData.bump_products.length > 0) {
            sendFacebookServerEvent('AddToCart', order).catch(e => console.error(e));
        }

        res.status(200).json({ data: order });
    } catch (err) {
        next(err);
    }
}

export async function getOrders(req, res, next) {
    try {
        const { filter, startDate, endDate } = req.query;
        const orders = await orderService.listOrders(filter, startDate, endDate);
        res.json({ data: orders });
    } catch (err) {
        next(err);
    }
}

export async function getStats(req, res, next) {
    try {
        const { filter, startDate, endDate } = req.query;
        const stats = await orderService.getDashboardStats(filter, startDate, endDate);
        res.json({ data: stats });
    } catch (err) {
        next(err);
    }
}

export async function getAnalytics(req, res, next) {
    try {
        const analytics = await orderService.getAnalytics();
        res.json({ data: analytics });
    } catch (err) {
        next(err);
    }
}
export async function getOrderById(req, res, next) {
    try {
        const order = await orderService.getOrderById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ data: order });
    } catch (err) {
        next(err);
    }
}
