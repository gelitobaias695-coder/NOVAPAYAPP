import { Router } from 'express';
import pool from '../db/pool.js';
import * as emailService from '../services/emailService.js';

const router = Router();

// GET email settings
router.get('/settings', async (req, res, next) => {
    try {
        const result = await pool.query(`SELECT * FROM email_settings LIMIT 1`);
        let settings = result.rows[0];
        if (!settings) {
            settings = {
                smtp_host: '', smtp_port: 587, smtp_user: '',
                sender_name: 'NovaPay', sender_email: 'noreply@novapay.co'
            };
        } else {
            // Mask password
            settings.smtp_pass_masked = settings.smtp_pass ? '••••••••' : '';
            delete settings.smtp_pass;
        }
        res.json({ data: settings });
    } catch (err) { next(err); }
});

// SAVE email settings
router.put('/settings', async (req, res, next) => {
    try {
        const { smtp_host, smtp_port, smtp_user, smtp_pass, sender_name, sender_email } = req.body;

        const existing = await pool.query(`SELECT id FROM email_settings LIMIT 1`);

        if (existing.rowCount === 0) {
            await pool.query(
                `INSERT INTO email_settings (smtp_host, smtp_port, smtp_user, smtp_pass, sender_name, sender_email)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [smtp_host || '', smtp_port || 587, smtp_user || '', smtp_pass || '', sender_name || 'NovaPay', sender_email || 'noreply@novapay.co']
            );
        } else {
            await pool.query(
                `UPDATE email_settings SET 
                 smtp_host = $1, 
                 smtp_port = $2, 
                 smtp_user = $3, 
                 smtp_pass = COALESCE(NULLIF($4, ''), smtp_pass),
                 sender_name = $5,
                 sender_email = $6,
                 updated_at = NOW()
                 WHERE id = $7`,
                [smtp_host || '', smtp_port || 587, smtp_user || '', smtp_pass || '', sender_name || 'NovaPay', sender_email || 'noreply@novapay.co', existing.rows[0].id]
            );
        }
        res.json({ message: 'Configurações de SMTP salvas com sucesso no Neon!' });
    } catch (err) { next(err); }
});

// TEST email functionality
router.post('/test', async (req, res, next) => {
    try {
        const { to } = req.body;
        await emailService.sendTestEmail(to || 'test@novapay.co');
        res.json({ message: 'E-mail de teste disparado com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
