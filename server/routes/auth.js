import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username va parol kiritilishi shart' });
        }

        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(401).json({ error: 'Noto\'g\'ri username yoki parol' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Noto\'g\'ri username yoki parol' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
            process.env.JWT_SECRET || 'sklad_secret_key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Token topilmadi' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sklad_secret_key');
        const user = await User.findByPk(decoded.id, { attributes: ['id', 'username', 'full_name', 'role'] });
        if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
        res.json(user);
    } catch (error) {
        res.status(401).json({ error: 'Yaroqsiz token' });
    }
});

export default router;
