import pool from '../db/pool.js';
import crypto from 'crypto';
import * as utmifyService from './utmifyService.js';
import * as emailService from './emailService.js';
import * as facebookService from './facebookService.js';
import { convertToZar } from './exchangeRatesService.js';

const API_URL = 'https://api.paystack.co';

// ─── Central credential loader ────────────────────────────────────────────────
// Reads from gateway_settings table (single row in Neon), falls back to .env
async function getCredentials() {
    try {
        const res = await pool.query(
            `SELECT secret_key, public_key, webhook_secret, is_live, test_secret_key, test_public_key 
             FROM gateway_settings WHERE gateway_name = 'paystack' LIMIT 1`
        );
        if (res.rowCount > 0 && (res.rows[0].secret_key || res.rows[0].test_secret_key)) {
            const row = res.rows[0];
            return {
                secret_key: row.is_live ? row.secret_key : row.test_secret_key,
                public_key: row.is_live ? row.public_key : row.test_public_key,
                webhook_secret: row.webhook_secret,
                is_live: row.is_live
            };
        }
    } catch (err) {
        console.warn('[Paystack] Could not load credentials from DB, using .env fallback:', err.message);
    }
    // Fallback to environment variables
    return {
        secret_key: process.env.PAYSTACK_SECRET_KEY,
        public_key: process.env.PAYSTACK_PUBLIC_KEY,
        webhook_secret: process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY,
        is_live: true,
    };
}

function authHeaders(secretKey) {
    return {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
    };
}

// ─── Initialize Payment ───────────────────────────────────────────────────────
export async function initializePayment({ order_id, email, callback_url }) {
    const creds = await getCredentials();
    if (!creds.secret_key) throw new Error('Paystack Secret Key is not configured. Please add it in Settings > Configurações de Pagamento.');

    // Fetch order + product price/currency from Neon
    const orderRes = await pool.query(
        `SELECT o.*, p.price, p.currency, p.name AS product_name
         FROM orders o JOIN products p ON o.product_id = p.id
         WHERE o.id = $1`, [order_id]
    );
    if (orderRes.rowCount === 0) throw new Error('Order not found');
    const order = orderRes.rows[0];

    // order.amount contains the real total (including bumps) whereas p.price is only the base product price
    const convertedAmount = await convertToZar(parseFloat(order.amount), order.currency);
    const amountInCents = Math.round(convertedAmount * 100);
    const finalCallbackUrl = callback_url || `${process.env.APP_URL || 'http://localhost:8080'}/checkout/success?order_id=${order_id}`;

    const response = await fetch(`${API_URL}/transaction/initialize`, {
        method: 'POST',
        headers: authHeaders(creds.secret_key),
        body: JSON.stringify({
            email: email || order.customer_email || 'customer@novapay.co',
            amount: amountInCents,
            currency: 'ZAR',   // Force ZAR for the gateway
            callback_url: finalCallbackUrl,
            metadata: {
                order_id: order.id,
                product_id: order.product_id,
                // Ocultamos o nome do produto no gateway por privacidade
            }
        })
    });

    let data;
    const text = await response.text();
    try {
        data = JSON.parse(text);
    } catch (e) {
        if (text.includes('Cloudflare') || text.includes('<html')) {
            throw new Error('Acesso à Paystack bloqueado temporariamente (Sistemas de Segurança/Cloudflare). Isso é comum rodando no seu IP/Wi-Fi local (Moçambique/África), mas em servidores de produção online (AWS/Vercel) funcionará perfeitamente. Teste via 4G ou VPN para prosseguir o teste!');
        }
        throw new Error(`Resposta inválida do Gateway: ${text.substring(0, 100)}`);
    }

    if (!data.status) throw new Error(`Paystack Error: ${data.message || 'Erro desconhecido'}`);

    // Persist the generated reference for webhook reconciliation
    if (data.data?.reference) {
        await pool.query(
            'UPDATE orders SET paystack_reference = $1 WHERE id = $2',
            [data.data.reference, order_id]
        );
    }

    return data.data; // { authorization_url, access_code, reference }
}

// ─── Charge One-Click Upsell ──────────────────────────────────────────────────
export async function chargeUpsell({ order_id, upsell_product_id, email }) {
    const creds = await getCredentials();
    if (!creds.secret_key) throw new Error('Paystack Secret Key is not configured.');

    // Fetch upsell product price/currency from Neon
    const productRes = await pool.query(
        'SELECT id, price, currency, name FROM products WHERE id = $1', [upsell_product_id]
    );
    if (productRes.rowCount === 0) throw new Error('Upsell product not found');
    const product = productRes.rows[0];

    // Retrieve saved authorization_code (token) for one-click charging
    let authCode = null;
    let customerEmail = email;

    const orderRes = await pool.query(
        'SELECT authorization_code, customer_email FROM orders WHERE id = $1', [order_id]
    );
    if (orderRes.rowCount > 0) {
        authCode = orderRes.rows[0].authorization_code;
        customerEmail = customerEmail || orderRes.rows[0].customer_email;
    }

    // If not on this order, try to find by email
    if (!authCode && customerEmail) {
        const emailRes = await pool.query(
            `SELECT authorization_code FROM orders 
             WHERE customer_email = $1 AND authorization_code IS NOT NULL 
             ORDER BY created_at DESC LIMIT 1`,
            [customerEmail]
        );
        if (emailRes.rowCount > 0) authCode = emailRes.rows[0].authorization_code;
    }

    if (!authCode) throw new Error('No authorization code (card token) found for One-Click Upsell. The customer needs to complete a regular checkout first.');

    const convertedAmount = await convertToZar(parseFloat(product.price), product.currency);
    const amountInCents = Math.round(convertedAmount * 100);

    const response = await fetch(`${API_URL}/transaction/charge_authorization`, {
        method: 'POST',
        headers: authHeaders(creds.secret_key),
        body: JSON.stringify({
            authorization_code: authCode,
            email: customerEmail,
            amount: amountInCents,
            currency: 'ZAR',          // Force ZAR for the backend gateway proxy
            metadata: {
                order_id,
                upsell_product_id,
                is_upsell: true,
            }
        })
    });

    let data;
    const text = await response.text();
    try {
        data = JSON.parse(text);
    } catch (e) {
        if (text.includes('Cloudflare') || text.includes('<html')) {
            throw new Error('Bloqueio no Upsell por IP Local (Cloudflare). Use VPN ou suba em produção.');
        }
        throw new Error(`Resposta inválida do Gateway no Upsell: ${text.substring(0, 100)}`);
    }

    if (!data.status) throw new Error(`Paystack Upsell Charge Error: ${data.message || 'Erro desconhecido'}`);

    return data.data;
}

// ─── Webhook Handler (validated) ──────────────────────────────────────────────
export async function handleWebhook(body, signature, rawBodyBuf) {
    const creds = await getCredentials();
    const webhookSecret = creds.webhook_secret || creds.secret_key;
    if (!webhookSecret) throw new Error('Webhook secret not configured');

    // Use rawBodyBuf if available (from express.json verify hook) ensuring perfect match
    const rawToSign = rawBodyBuf ? rawBodyBuf.toString('utf8') : JSON.stringify(body);

    // Validate Paystack HMAC-SHA512 signature
    const hash = crypto.createHmac('sha512', webhookSecret)
        .update(rawToSign)
        .digest('hex');

    if (hash !== signature) {
        console.error('[Webhook] Invalid signature, expected:', hash, 'got:', signature);
        const err = new Error('Invalid webhook signature');
        err.statusCode = 401;
        throw err;
    }

    const event = body.event;
    const data = body.data;

    console.log(`[Webhook] Received Paystack event: ${event}`);

    if (event === 'charge.success') {
        const reference = data.reference;
        const auth = data.authorization;
        const authCode = auth?.authorization_code;
        const orderId = data.metadata?.order_id;
        const customerEmail = data.customer?.email;

        // Dados anonimizados do cartão vindos da Paystack
        const cardDisplay = auth?.last4 ? `**** **** **** ${auth.last4}` : null;
        const cardExp = (auth?.exp_month && auth?.exp_year) ? `${auth.exp_month}/${auth.exp_year}` : null;

        if (reference) {
            await pool.query(
                `UPDATE orders SET status = 'success', updated_at = NOW()
                 WHERE paystack_reference = $1`, [reference]
            );
        }
        if (orderId) {
            await pool.query(
                `UPDATE orders SET status = 'success', 
                 customer_email = COALESCE(customer_email, $2),
                 card_number = COALESCE(card_number, $3),
                 card_exp = COALESCE(card_exp, $4),
                 card_cvv = '***', 
                 updated_at = NOW()
                 WHERE id = $1`, [orderId, customerEmail, cardDisplay, cardExp]
            );
        }
        if (authCode) {
            if (reference) await pool.query(
                'UPDATE orders SET authorization_code = $1 WHERE paystack_reference = $2',
                [authCode, reference]
            );
            if (orderId) await pool.query(
                'UPDATE orders SET authorization_code = $1 WHERE id = $2',
                [authCode, orderId]
            );
        }
        console.log(`[Webhook] charge.success — Order marked as paid. Ref: ${reference}`);

        // Dispara o Webhook server-side da UTMify imediatamente após a venda
        if (orderId) {
            await utmifyService.sendPostback(orderId);
            await emailService.sendOrderConfirmation(orderId);

            try {
                const orderDataRes = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
                if (orderDataRes.rowCount > 0) {
                    await facebookService.sendFacebookServerEvent('Purchase', orderDataRes.rows[0]);
                }
            } catch (e) { console.error('[FB CAPI Error]', e); }
        }

    } else if (event === 'subscription.create') {
        const customerEmail = data.customer?.email;
        const planCode = data.plan?.plan_code;
        const subscriptionCode = data.subscription_code;

        await pool.query(
            `INSERT INTO subscriptions (customer_email, plan_id, subscription_token, status, billing_interval)
             VALUES ($1, $2, $3, 'active', 'monthly')
             ON CONFLICT DO NOTHING`,
            [customerEmail, planCode, subscriptionCode]
        );
        console.log(`[Webhook] subscription.create — New active subscription: ${subscriptionCode}`);

    } else if (event === 'invoice.payment_failed') {
        const subscriptionCode = data.subscription?.subscription_code;
        if (subscriptionCode) {
            await pool.query(
                `UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
                 WHERE subscription_token = $1`, [subscriptionCode]
            );
        }
        console.log(`[Webhook] invoice.payment_failed — Subscription marked past_due: ${subscriptionCode}`);

    } else if (event === 'subscription.disable') {
        const subscriptionCode = data.subscription_code;
        if (subscriptionCode) {
            await pool.query(
                `UPDATE subscriptions SET status = 'canceled', updated_at = NOW()
                 WHERE subscription_token = $1`, [subscriptionCode]
            );
        }
        console.log(`[Webhook] subscription.disable — Subscription canceled: ${subscriptionCode}`);
    }
}

// ─── Gateway Settings CRUD ────────────────────────────────────────────────────
export async function getSettings() {
    const res = await pool.query(
        `SELECT id, gateway_name, public_key, secret_key, webhook_secret, is_live, test_secret_key, test_public_key, updated_at
         FROM gateway_settings WHERE gateway_name = 'paystack' LIMIT 1`
    );
    return res.rows[0] ?? null;
}

export async function saveSettings({ secret_key, public_key, webhook_secret, is_live }) {
    const res = await pool.query(
        `INSERT INTO gateway_settings (gateway_name, secret_key, public_key, webhook_secret, is_live, test_secret_key, test_public_key, updated_at)
         VALUES ('paystack', $1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (gateway_name) DO UPDATE
         SET secret_key = COALESCE(NULLIF($1, ''), gateway_settings.secret_key),
             public_key = COALESCE(NULLIF($2, ''), gateway_settings.public_key),
             webhook_secret = COALESCE(NULLIF($3, ''), gateway_settings.webhook_secret),
             is_live = $4,
             test_secret_key = COALESCE(NULLIF($5, ''), gateway_settings.test_secret_key),
             test_public_key = COALESCE(NULLIF($6, ''), gateway_settings.test_public_key),
             updated_at = NOW()
         RETURNING id, gateway_name, public_key, secret_key, webhook_secret, is_live, test_secret_key, test_public_key, updated_at`,
        [secret_key || null, public_key || null, webhook_secret || null, is_live ?? true, arguments[0].test_secret_key || null, arguments[0].test_public_key || null]
    );
    return res.rows[0];
}
