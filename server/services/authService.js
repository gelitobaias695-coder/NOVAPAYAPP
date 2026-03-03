import pool from '../db/pool.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getTransporter } from './emailService.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_novapay';

export async function login(email, password) {
    const res = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    const admin = res.rows[0];

    if (!admin) {
        throw new Error('Credenciais inválidas.');
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
        throw new Error('Credenciais inválidas.');
    }

    const token = jwt.sign({ id: admin.id, email: admin.email, name: admin.name }, JWT_SECRET, {
        expiresIn: '24h',
    });

    return { token, admin: { id: admin.id, name: admin.name, email: admin.email } };
}

export async function registerAdmin(name, email, password) {
    const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
        throw new Error('Este e-mail já está em uso.');
    }

    const hash = await bcrypt.hash(password, 10);
    const res = await pool.query(
        'INSERT INTO admins (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
        [name, email, hash]
    );

    const admin = res.rows[0];

    const token = jwt.sign({ id: admin.id, email: admin.email, name: admin.name }, JWT_SECRET, {
        expiresIn: '24h',
    });

    return { token, admin: { id: admin.id, name: admin.name, email: admin.email } };
}

export async function forgotPassword(email) {
    const res = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (res.rowCount === 0) {
        // Prevent enumerating users
        return;
    }
    const admin = res.rows[0];

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
        'UPDATE admins SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
        [resetToken, resetExpires, admin.id]
    );

    try {
        const { transporter, senderName, senderEmail } = await getTransporter();

        const baseUrl = process.env.VITE_APP_URL || process.env.FRONTEND_URL || 'http://localhost:8080';
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Redefinição de Senha NovaPay</h2>
                <p>Olá ${admin.name},</p>
                <p>Você solicitou a redefinição de senha para sua conta de administrador.</p>
                <p>Clique no link abaixo para criar uma nova senha:</p>
                <p><a href="${resetLink}" style="background-color: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Redefinir Senha</a></p>
                <p>Ou copie e cole este link no seu navegador: ${resetLink}</p>
                <p>Este link expira em 1 hora.</p>
            </div>
        `;

        await transporter.sendMail({
            from: `"${senderName}" <${senderEmail}>`,
            to: admin.email,
            subject: 'Redefinição de Senha - NovaPay',
            html: html,
        });
    } catch (err) {
        console.error('Failed to send reset email:', err);
        throw new Error('Erro ao enviar e-mail de redefinição. Verifique suas configurações de SMTP.');
    }
}

export async function resetPassword(token, newPassword) {
    const res = await pool.query(
        'SELECT * FROM admins WHERE reset_token = $1 AND reset_token_expires > NOW()',
        [token]
    );

    if (res.rowCount === 0) {
        throw new Error('Token inválido ou expirado.');
    }

    const admin = res.rows[0];
    const hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
        'UPDATE admins SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
        [hash, admin.id]
    );
}

export async function changePassword(adminId, oldPassword, newPassword) {
    const res = await pool.query('SELECT * FROM admins WHERE id = $1', [adminId]);
    if (res.rowCount === 0) {
        throw new Error('Administrador não encontrado.');
    }

    const admin = res.rows[0];
    const isMatch = await bcrypt.compare(oldPassword, admin.password_hash);

    if (!isMatch) {
        throw new Error('Senha atual incorreta.');
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admins SET password_hash = $1 WHERE id = $2', [hash, adminId]);
}
