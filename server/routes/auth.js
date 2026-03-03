import { Router } from 'express';
import * as authService from '../services/authService.js';

const router = Router();

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const data = await authService.login(email, password);
        res.json({ status: 'success', data });
    } catch (err) {
        err.statusCode = 401;
        next(err);
    }
});

router.post('/register', async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const data = await authService.registerAdmin(name, email, password);
        res.json({ status: 'success', data });
    } catch (err) {
        err.statusCode = 400;
        next(err);
    }
});

router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;
        await authService.forgotPassword(email);
        res.json({ status: 'success', message: 'Se o email existir, um link de recuperação foi enviado.' });
    } catch (err) {
        next(err);
    }
});

router.post('/reset-password', async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        await authService.resetPassword(token, newPassword);
        res.json({ status: 'success', message: 'Senha redefinida com sucesso!' });
    } catch (err) {
        next(err);
    }
});

router.post('/change-password', async (req, res, next) => {
    try {
        const { adminId, currentPassword, newPassword } = req.body;
        if (!adminId || !currentPassword || !newPassword) {
            throw new Error('Preencha a senha atual e a nova senha.');
        }
        await authService.changePassword(adminId, currentPassword, newPassword);
        res.json({ status: 'success', message: 'Senha alterada com sucesso!' });
    } catch (err) {
        err.statusCode = 400;
        next(err);
    }
});

export default router;
