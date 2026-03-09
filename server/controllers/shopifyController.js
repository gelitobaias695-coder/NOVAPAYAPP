import * as utmifyService from '../services/utmifyService.js';

export async function handleWebhook(req, res) {
    try {
        const topic = req.headers['x-shopify-topic'];
        const shopDomain = req.headers['x-shopify-shop-domain'];
        const orderData = req.body;

        console.log(`[Shopify Webhook] Topic: ${topic} from ${shopDomain}`);

        // Supported topics for UTMify tracking
        if (topic === 'orders/paid' || topic === 'orders/create' || topic === 'orders/fulfilled') {
            console.log(`[Shopify] Processing order ${orderData.id} for UTMify tracking...`);

            // Extract UTM params from order note or tags if available, 
            // Shopify usually puts these in landing_site or as note attributes
            const noteAttributes = orderData.note_attributes || [];
            const findAttr = (name) => noteAttributes.find(a => a.name === name)?.value || '';

            const normalizedOrder = {
                platform: 'Shopify',
                orderId: orderData.id || orderData.order_number,
                paymentMethod: orderData.gateway || 'shopify_checkout',
                status: orderData.financial_status === 'paid' ? 'approved' : 'waiting_payment',
                createdAt: orderData.created_at,
                amountInCents: Math.round(parseFloat(orderData.total_price || 0) * 100),
                currency: orderData.currency || 'BRL',
                customerName: `${orderData.customer?.first_name || ''} ${orderData.customer?.last_name || ''}`.trim(),
                customerEmail: orderData.customer?.email || orderData.email,
                customerPhone: orderData.customer?.phone || orderData.phone,
                countryCode: orderData.shipping_address?.country_code || 'BR',
                city: orderData.shipping_address?.city || '',
                state: orderData.shipping_address?.province_code || '',
                zipCode: orderData.shipping_address?.zip || '',
                products: (orderData.line_items || []).map(item => ({
                    id: item.variant_id || item.product_id,
                    name: item.name || item.title,
                    priceInCents: Math.round(parseFloat(item.price || 0) * 100),
                    quantity: item.quantity
                })),
                trackingParameters: {
                    utm_source: findAttr('utm_source') || findAttr('utm_source') || '',
                    utm_medium: findAttr('utm_medium') || '',
                    utm_campaign: findAttr('utm_campaign') || '',
                    utm_content: findAttr('utm_content') || '',
                    utm_term: findAttr('utm_term') || '',
                    src: findAttr('src') || ''
                }
            };

            await utmifyService.sendUtmifyOrder(normalizedOrder);
        }

        res.status(200).send('OK');
    } catch (err) {
        console.error('[Shopify Webhook Error]', err.message);
        res.status(200).send('OK'); // Always return 200 to Shopify to avoid retries on format errors
    }
}
