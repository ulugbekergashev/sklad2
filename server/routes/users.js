import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';

const router = Router();

// GET /api/users
router.get('/', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'full_name', 'role', 'phone', 'telegram_chat_id', 'createdAt'],
            order: [['createdAt', 'DESC']],
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Xodimlarni olishda xatolik' });
    }
});

// POST /api/users
router.post('/', async (req, res) => {
    try {
        const { username, password, full_name, role, phone } = req.body;
        if (!username || !password || !full_name) {
            return res.status(400).json({ error: 'Username, parol va ism kiritilishi shart' });
        }

        const existing = await User.findOne({ where: { username } });
        if (existing) return res.status(400).json({ error: 'Bu username allaqachon band' });

        const password_hash = await bcrypt.hash(password, 10);
        const user = await User.create({
            username, password_hash, full_name,
            role: role || 'warehouse_staff',
            phone: phone || null,
        });

        res.status(201).json({
            id: user.id, username: user.username,
            full_name: user.full_name, role: user.role,
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Xodim yaratishda xatolik' });
    }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Xodim topilmadi' });

        const { full_name, role, password, phone } = req.body;
        const updates = {};
        if (full_name) updates.full_name = full_name;
        if (role) updates.role = role;
        if (phone !== undefined) updates.phone = phone;
        if (password) updates.password_hash = await bcrypt.hash(password, 10);

        await user.update(updates);
        res.json({ id: user.id, username: user.username, full_name: user.full_name, role: user.role });
    } catch (error) {
        res.status(500).json({ error: 'Xodimni yangilashda xatolik' });
    }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Topilmadi' });
        if (user.username === 'admin') return res.status(400).json({ error: 'Admin ni o\'chirib bo\'lmaydi' });
        await user.destroy();
        res.json({ message: 'Xodim o\'chirildi' });
    } catch (error) {
        res.status(500).json({ error: 'O\'chirishda xatolik' });
    }
});

export default router;
