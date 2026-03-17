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

    // According to documentation, reference must be a string without SPACES.
    // We also remove hyphens to be safe and ensure it is a clean string.
    const reference = order_id.toString().replace(/-/g, '').substring(0, 11);
    
    const bodyData = {
        client_id: settings.client_id, // Mandatory as per documentation Example 06
        amount: amount.toString(),
        phone: phone.toString(),
        reference: reference
    };

    console.log(`[E2P] Initiating ${network} payment:`, { endpoint, reference, phone, amount });

    const resTransaction = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(bodyData)
    });

    const responseText = await resTransaction.text();
    
    if (!resTransaction.ok) {
        console.error(`[E2P] ${network} Transaction Error:`, responseText);
        throw new Error(`E2Payments Transaction Error: ${responseText}`);
    }

    try {
        const result = JSON.parse(responseText);
        console.log(`[E2P] ${network} Response:`, result);
        return result;
    } catch (e) {
        console.log(`[E2P] ${network} Raw Response (not JSON):`, responseText);
        return { message: responseText };
    }
}

export async function handleWebhook(body) {
    // E2Payments webhook handler
    console.log('[E2P Webhook] Payload:', JSON.stringify(body));
    
    const isSuccess = JSON.stringify(body).toLowerCase().includes('completed') || 
                      body.status === 'success' || 
                      body.status === 'COMPLETED' ||
                      body.output_ResponseCode === 'INS-0';

    const reference = body.reference || body.tx_ref || body.transactionReference || body.output_ThirdPartyReference;

    if (isSuccess && reference) {
        console.log('[E2P Webhook] Success detected. Reference:', reference);
        // We match by the first 8 characters of the order ID to be safe with truncations
        await pool.query(
            `UPDATE orders 
             SET status = 'paid', payment_status = 'paid', 
                 payment_method = 'e2payments', 
                 gateway_transaction_id = $1, 
                 updated_at = NOW() 
             WHERE $2 LIKE '%' || substring(REPLACE(id::text, '-', ''), 1, 8) || '%' AND status != 'paid'`,
            [body.transaction_id || body.output_TransactionID || null, reference]
        );
        console.log('[E2P Webhook] Order updated if found.');
    } else {
        console.log('[E2P Webhook] Not a success or no reference found.');
    }
}

