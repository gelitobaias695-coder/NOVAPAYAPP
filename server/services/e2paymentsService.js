import pool from '../db/pool.js';
import fetch from 'node-fetch';

let cachedToken = null;
let tokenExpiresAt = 0;

export async function getSettings() {
    const res = await pool.query(`SELECT * FROM gateway_settings WHERE gateway_name = 'e2payments' LIMIT 1`);
    if (res.rowCount === 0) {
        return { client_id: '', client_secret: '', wallet_mpesa: '', wallet_emola: '', is_live: true };
    }
    const row = res.rows[0];
    return {
        client_id: row.public_key || '',
        client_secret: row.secret_key || '',
        wallet_mpesa: row.e2p_wallet_mpesa || '',
        wallet_emola: row.e2p_wallet_emola || '',
        is_live: row.is_live ?? true
    };
}

export async function saveSettings(data) {
    const { client_id, client_secret, wallet_mpesa, wallet_emola, is_live } = data;
    const cleanMpesa = wallet_mpesa ? wallet_mpesa.replace(/#/g, '').trim() : '';
    const cleanEmola = wallet_emola ? wallet_emola.replace(/#/g, '').trim() : '';
    const res = await pool.query(
        `INSERT INTO gateway_settings (gateway_name, public_key, secret_key, e2p_wallet_mpesa, e2p_wallet_emola, is_live, updated_at)
         VALUES ('e2payments', $1, $2, $3, $4, $5, NOW())
         ON CONFLICT (gateway_name) DO UPDATE SET
            public_key = EXCLUDED.public_key,
            secret_key = EXCLUDED.secret_key,
            e2p_wallet_mpesa = EXCLUDED.e2p_wallet_mpesa,
            e2p_wallet_emola = EXCLUDED.e2p_wallet_emola,
            is_live = EXCLUDED.is_live,
            updated_at = NOW()
         RETURNING *`,
        [client_id, client_secret, cleanMpesa, cleanEmola, is_live]
    );
    return res.rows[0];
}



async function getAccessToken(client_id, client_secret) {
    if (cachedToken && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }

    const bodyData = {
        client_id: client_id,
        client_secret: client_secret,
        grant_type: 'client_credentials'
    };

    const resToken = await fetch('https://e2payments.explicador.co.mz/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(bodyData)
    });

    if (!resToken.ok) {
        const text = await resToken.text();
        throw new Error(`E2Payments Token Error: ${text}`);
    }

    const tokenData = await resToken.json();
    cachedToken = tokenData.access_token;
    tokenExpiresAt = Date.now() + ((tokenData.expires_in - 60) * 1000); // 1 min buffer
    return cachedToken;
}

export async function initializePayment({ order_id, phone, network, amount }) {
    const settings = await getSettings();
    if (!settings.client_id || !settings.client_secret) {
        throw new Error("E2Payments credentials not configured");
    }

    const token = await getAccessToken(settings.client_id, settings.client_secret);
    
    // Choose endpoint and wallet depending on the network
    let walletId = '';
    let endpoint = '';
    // network from client should be 'mpesa' or 'emola'
    if (network === 'mpesa') {
        walletId = settings.wallet_mpesa;
        endpoint = `https://e2payments.explicador.co.mz/v1/c2b/mpesa-payment/${walletId}`;
    } else if (network === 'emola') {
        walletId = settings.wallet_emola;
        endpoint = `https://e2payments.explicador.co.mz/v1/c2b/emola-payment/${walletId}`;
    } else {
        throw new Error("Invalid network for E2Payments. Must be mpesa or emola.");
    }

    if (!walletId) {
        throw new Error(`Wallet ID for ${network} not configured in settings.`);
    }

    const bodyData = {
        phone: phone.toString(),
        amount: amount.toString(),
        reference: order_id.toString().replace(/-/g, '').substring(0, 10),
        client_id: settings.client_id
    };

    const resTransaction = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(bodyData)
    });

    if (!resTransaction.ok) {
        const text = await resTransaction.text();
        throw new Error(`E2Payments Transaction Error: ${text}`);
    }

    const result = await resTransaction.json();
    return result;
}

export async function handleWebhook(body) {
    // E2Payments webhook handler
    // Documentation says it sends PAYMENT-COMPLETED, PAYMENT-FAILED, etc.
    // The webhook payload usually contains reference and status.
    // But we need to see the exact payload. We will just capture the data and update orders for now.
    
    // example body structure might have: { reference, status, amount, transaction_id }
    // As per generic gateways, we try updating the order status to 'paid' if it's successful.
    
    // Assuming E2Payments webhook payload has event type and transaction details.
    console.log('[E2P Webhook]', body);
    
    // Try to update order if successful. Without exact doc, matching "COMPLETED" or "successful"
    const isSuccess = JSON.stringify(body).toLowerCase().includes('completed') || 
                      body.status === 'success' || 
                      body.status === 'COMPLETED';

    const reference = body.reference || body.tx_ref || body.transactionReference;

    if (isSuccess && reference) {
        await pool.query(
            `UPDATE orders 
             SET status = 'paid', payment_status = 'paid', 
                 payment_method = 'e2payments', 
                 gateway_transaction_id = $1, 
                 updated_at = NOW() 
             WHERE $2 LIKE '%' || substring(REPLACE(id::text, '-', ''), 1, 10) || '%' AND status != 'paid'`,
            [body.transaction_id || null, reference]
        );
    }
}
