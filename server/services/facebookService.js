import pool from '../db/pool.js';
import crypto from 'crypto';

// Hash helper for User Data
const hashData = (data) => {
    if (!data) return undefined;
    if (typeof data === 'string') {
        const str = data.trim().toLowerCase();
        if (!str) return undefined;
        return crypto.createHash('sha256').update(str).digest('hex');
    }
    return data;
};

export const sendFacebookServerEvent = async (eventName, orderData, customDataArgs = {}) => {
    try {
        // Obter config Pixel do banco de dados (pixel_settings tem fb_access_token, etc)
        const settingsRes = await pool.query('SELECT pixel_id, access_token, server_side, app_id, app_secret FROM pixel_settings WHERE id = 1');
        const config = settingsRes.rows[0];

        if (!config || !config.pixel_id || !config.access_token || !config.server_side) {
            console.log(`[FB CAPI] Abortando ${eventName}: CAPI não está ativo ou faltam credenciais.`);
            return;
        }

        // Deduplication: always use the order UUID as event_id
        const orderId = orderData.id;

        // User Data - Hashed according to FB requirements
        const userData = {};

        if (orderData.customer_email) userData.em = [hashData(orderData.customer_email)];
        if (orderData.customer_phone) {
            // Facebook prefere formato E.164 (ex: só números, código país)
            const cleanPhone = orderData.customer_phone.replace(/\D/g, '');
            userData.ph = [hashData(cleanPhone)];
        }

        // Client IP Address e User Agent essenciais para FB event matching
        if (orderData.client_ip_address) userData.client_ip_address = orderData.client_ip_address;
        if (orderData.user_agent) userData.client_user_agent = orderData.user_agent;

        // Outros campos opcionais de matching, por exemplo: FBC/FBP poderiam ser salvos na session ou order, mas por ora enviaremos o que temos.

        // Custom Data
        const customData = {
            currency: customDataArgs.currency || orderData.currency || 'ZAR',
            value: customDataArgs.value || parseFloat(orderData.amount || orderData.price || 0),
            order_id: orderId,
            content_name: customDataArgs.product_name || orderData.product_name || 'Produto',
            content_type: 'product',
        };

        // Se houver productId
        if (orderData.product_id) {
            customData.content_ids = [orderData.product_id];
        }

        // Add utm params if any match what Utmify/Facebook want (though FB uses fbc/fbp, UTM can go into customData)
        if (orderData.utm_source) customData.utm_source = orderData.utm_source;
        if (orderData.utm_medium) customData.utm_medium = orderData.utm_medium;
        if (orderData.utm_campaign) customData.utm_campaign = orderData.utm_campaign;

        // Construir o payload
        const payload = {
            data: [
                {
                    event_name: eventName,
                    event_time: Math.floor(Date.now() / 1000),
                    action_source: "website",
                    event_id: orderId, // Para Deduplication!
                    user_data: userData,
                    custom_data: customData,
                }
            ]
        };

        const fbUrl = `https://graph.facebook.com/v19.0/${config.pixel_id}/events?access_token=${config.access_token}`;

        const response = await fetch(fbUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        // Salvar Log Database
        const isSuccess = response.ok;
        await pool.query(
            `INSERT INTO facebook_events_log (order_id, event_name, status, response, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [orderId, eventName, isSuccess ? 'success' : 'error', JSON.stringify(result)]
        );

        if (!isSuccess) {
            console.error(`[FB CAPI] Erro do Facebook ao logar evento ${eventName}:`, result);
        } else {
            console.log(`[FB CAPI] Evento ${eventName} disparado com sucesso. Event ID: ${orderId}`);
        }

    } catch (error) {
        console.error(`[FB CAPI] Exceção ao tentar disparar evento ${eventName}:`, error.message);
    }
};
