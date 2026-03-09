import { Router } from 'express';
import { Category } from '../models/index.js';

const router = Router();

// GET /api/categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.findAll({ order: [['name', 'ASC']] });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Kategoriyalarni olishda xatolik' });
    }
});

// POST /api/categories
router.post('/', async (req, res) => {
    try {
        const { name, description, color } = req.body;
        if (!name) return res.status(400).json({ error: 'Nom kiritilishi shart' });
        const category = await Category.create({ name, description, color });
        res.status(201).json(category);
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Kategoriya yaratishda xatolik' });
    }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res) => {
    try {
        const cat = await Category.findByPk(req.params.id);
        if (!cat) return res.status(404).json({ error: 'Kategoriya topilmadi' });
        await cat.update(req.body);
        res.json(cat);
    } catch (error) {
        res.status(500).json({ error: 'Kategoriyani yangilashda xatolik' });
    }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
    try {
        const cat = await Category.findByPk(req.params.id);
        if (!cat) return res.status(404).json({ error: 'Kategoriya topilmadi' });
        await cat.destroy();
        res.json({ message: 'Kategoriya o\'chirildi' });
    } catch (error) {
        res.status(500).json({ error: 'Kategoriyani o\'chirishda xatolik' });
    }
});

export default router;
