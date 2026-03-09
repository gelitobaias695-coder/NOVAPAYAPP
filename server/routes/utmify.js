import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

router.get('/settings', async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT secret_key as utmify_api_token, public_key as platform_name, id, updated_at
             FROM gateway_settings WHERE gateway_name = 'utmify' ORDER BY updated_at DESC`
        );
        console.log(`[UTMify Dev] Found ${result.rowCount} settings rows for utmify.`);
        res.json({
            data: result.rows[0] || { utmify_api_token: '', platform_name: '' },
            count: result.rowCount,
            rows: result.rows.map(r => ({ id: r.id, updated_at: r.updated_at, token_len: r.utmify_api_token?.length }))
        });
    } catch (err) { next(err); }
});

router.put('/settings', async (req, res, next) => {
    try {
        const { utmify_api_token, platform_name } = req.body;
        console.log(`[UTMify] Saving settings. Token length: ${utmify_api_token?.length || 0}`);

        await pool.query(
            `INSERT INTO gateway_settings (gateway_name, secret_key, public_key, is_live, updated_at)
             VALUES ('utmify', $1, $2, true, NOW())
             ON CONFLICT (gateway_name) DO UPDATE
             SET secret_key = $1,
                 public_key = COALESCE($2, gateway_settings.public_key),
                 updated_at = NOW()`,
            [utmify_api_token, platform_name || null]
        );
        res.json({ message: 'Configurações do UTMify salvas no Neon com sucesso!' });
    } catch (err) {
        console.error('[UTMify] Error saving settings:', err.message);
        next(err);
    }
});

export default router;
