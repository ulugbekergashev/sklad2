import { Router } from 'express';
import { Supplier } from '../models/index.js';

const router = Router();

// GET /api/suppliers
router.get('/', async (req, res) => {
    try {
        const suppliers = await Supplier.findAll({ order: [['name', 'ASC']] });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: 'Yetkazib beruvchilarni olishda xatolik' });
    }
});

// POST /api/suppliers
router.post('/', async (req, res) => {
    try {
        const { name, contact_person, phone, email, address } = req.body;
        if (!name) return res.status(400).json({ error: 'Nom kiritilishi shart' });
        const supplier = await Supplier.create({ name, contact_person, phone, email, address });
        res.status(201).json(supplier);
    } catch (error) {
        res.status(500).json({ error: 'Yetkazib beruvchi yaratishda xatolik' });
    }
});

// PUT /api/suppliers/:id
router.put('/:id', async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ error: 'Topilmadi' });
        await supplier.update(req.body);
        res.json(supplier);
    } catch (error) {
        res.status(500).json({ error: 'Yangilashda xatolik' });
    }
});

export default router;
