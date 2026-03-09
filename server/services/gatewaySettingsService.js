import pool from '../db/pool.js';

/**
 * Fetches the current live mode status from gateway_settings.
 * Defaults to true if no settings are found.
 * @returns {Promise<boolean>}
 */
export async function getIsLiveMode() {
    try {
        const res = await pool.query(
            `SELECT is_live FROM gateway_settings WHERE gateway_name = 'paystack' LIMIT 1`
        );
        if (res.rowCount > 0) {
            return res.rows[0].is_live;
        }
    } catch (err) {
        console.warn('[GatewaySettings] Could not fetch is_live status:', err.message);
    }
    return true; // Default to live if not configured
}
