import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

router.get('/settings', async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT secret_key as utmify_api_token, public_key as platform_name 
             FROM gateway_settings WHERE gateway_name = 'utmify' LIMIT 1`
        );
        res.json({ data: result.rows[0] || { utmify_api_token: '', platform_name: '' } });
    } catch (err) { next(err); }
});

router.put('/settings', async (req, res, next) => {
    try {
        const { utmify_api_token, platform_name } = req.body;
        await pool.query(
            `INSERT INTO gateway_settings (gateway_name, secret_key, public_key, is_live, updated_at)
             VALUES ('utmify', $1, $2, true, NOW())
             ON CONFLICT (gateway_name) DO UPDATE
             SET secret_key = COALESCE(NULLIF($1, ''), gateway_settings.secret_key),
                 public_key = COALESCE(NULLIF($2, ''), gateway_settings.public_key),
                 updated_at = NOW()`,
            [utmify_api_token || null, platform_name || null]
        );
        res.json({ message: 'Configurações do UTMify salvas no Neon com sucesso!' });
    } catch (err) { next(err); }
});

export default router;
