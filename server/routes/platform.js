import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import pool from '../db/pool.js';

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        const uniqueSuffix = crypto.randomUUID();
        const ext = path.extname(file.originalname);
        cb(null, `favicon-${uniqueSuffix}${ext}`);
    }
});
const upload = multer({ storage });

const router = Router();

router.get('/settings', async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
                favicon_url, logo_url, updated_at, 
                notify_sale, notify_abandoned, notify_daily_report, 
                maintenance_mode, ip_country_detect, platform_fee 
            FROM platform_settings 
            LIMIT 1
        `);
        res.json({ data: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

router.post('/favicon', upload.single('favicon'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new Error('Nenhum arquivo enviado');
        }

        const baseUrl = process.env.VITE_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3001';
        let faviconUrl = '';

        if (process.env.NODE_ENV === 'production' && !baseUrl.includes('localhost')) {
            faviconUrl = `${baseUrl}/uploads/${req.file.filename}`;
        } else {
            // For dev
            faviconUrl = `http://localhost:3001/uploads/${req.file.filename}`;
        }

        const result = await pool.query(
            `UPDATE platform_settings SET favicon_url = $1, updated_at = NOW() RETURNING favicon_url, updated_at`,
            [faviconUrl]
        );

        res.json({ data: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

router.post('/logo', upload.single('logo'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new Error('Nenhum arquivo enviado');
        }

        const baseUrl = process.env.VITE_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3001';
        let logoUrl = '';

        if (process.env.NODE_ENV === 'production' && !baseUrl.includes('localhost')) {
            logoUrl = `${baseUrl}/uploads/${req.file.filename}`;
        } else {
            // For dev
            logoUrl = `http://localhost:3001/uploads/${req.file.filename}`;
        }

        const result = await pool.query(
            `UPDATE platform_settings SET logo_url = $1, updated_at = NOW() RETURNING logo_url, updated_at`,
            [logoUrl]
        );

        res.json({ data: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

router.put('/settings', async (req, res, next) => {
    try {
        const {
            notify_sale, notify_abandoned, notify_daily_report,
            maintenance_mode, ip_country_detect, platform_fee
        } = req.body;

        const result = await pool.query(`
            UPDATE platform_settings SET 
                notify_sale = COALESCE($1, notify_sale),
                notify_abandoned = COALESCE($2, notify_abandoned),
                notify_daily_report = COALESCE($3, notify_daily_report),
                maintenance_mode = COALESCE($4, maintenance_mode),
                ip_country_detect = COALESCE($5, ip_country_detect),
                platform_fee = COALESCE($6, platform_fee),
                updated_at = NOW()
            RETURNING *
        `, [
            notify_sale, notify_abandoned, notify_daily_report,
            maintenance_mode, ip_country_detect, platform_fee
        ]);

        res.json({ data: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

export default router;
