import * as utmifyService from '../services/utmifyService.js';

export async function handleWebhook(req, res) {
    try {
        const topic = req.headers['x-shopify-topic'];
        const shopDomain = req.headers['x-shopify-shop-domain'];
        const orderData = req.body;

        console.log(`[Shopify Webhook] Topic: ${topic} from ${shopDomain}`);

        // Supported topics for UTMify tracking
        const supportedTopics = ['orders/paid', 'orders/create', 'orders/fulfilled', 'orders/partially_paid'];

        if (supportedTopics.includes(topic)) {
            console.log(`[Shopify] Processing order ${orderData.id || orderData.order_number} for UTMify tracking...`);

            // Extract UTM params from various possible locations in Shopify payload
            const noteAttributes = orderData.note_attributes || [];
            const findAttr = (name) => {
                const attr = noteAttributes.find(a => a.name === name || a.name === `_${name}`);
                return attr ? attr.value : '';
            };

            // UTMify also looks for these in the landing_site URL parameters
            const landingSite = orderData.landing_site || '';
            const getUrlParam = (url, param) => {
                try {
                    const regex = new RegExp(`[?&]${param}=([^&#]*)`, 'i');
                    const match = regex.exec(url);
                    return match ? decodeURIComponent(match[1]) : '';
                } catch (e) { return ''; }
            };

            const normalizedOrder = {
                platform: 'Shopify',
                orderId: orderData.id || orderData.order_number,
                paymentMethod: orderData.gateway || 'shopify_checkout',
                status: (orderData.financial_status === 'paid' || orderData.financial_status === 'partially_paid') ? 'approved' : 'waiting_payment',
                createdAt: orderData.created_at,
                amountInCents: Math.round(parseFloat(orderData.total_price || 0) * 100),
                currency: orderData.currency || 'BRL',
                customerName: `${orderData.customer?.first_name || ''} ${orderData.customer?.last_name || ''}`.trim() || 'Cliente Shopify',
                customerEmail: orderData.customer?.email || orderData.email || 'vazio@email.com',
                customerPhone: orderData.customer?.phone || orderData.phone || '',
                countryCode: orderData.shipping_address?.country_code || orderData.billing_address?.country_code || 'BR',
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
                    utm_source: findAttr('utm_source') || getUrlParam(landingSite, 'utm_source') || '',
                    utm_medium: findAttr('utm_medium') || getUrlParam(landingSite, 'utm_medium') || '',
                    utm_campaign: findAttr('utm_campaign') || getUrlParam(landingSite, 'utm_campaign') || '',
                    utm_content: findAttr('utm_content') || getUrlParam(landingSite, 'utm_content') || '',
                    utm_term: findAttr('utm_term') || getUrlParam(landingSite, 'utm_term') || '',
                    src: findAttr('src') || getUrlParam(landingSite, 'src') || ''
                }
            };

            await utmifyService.sendUtmifyOrder(normalizedOrder);
        }

        res.status(200).send('OK');
    } catch (err) {
        console.error('[Shopify Webhook Error]', err.message);
        res.status(200).send('OK'); // Always return 200 to Shopify
    }
}
