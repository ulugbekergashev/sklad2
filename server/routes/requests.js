import express from 'express';
import { Op } from 'sequelize';
import { Request, User, Product } from '../models/index.js';

const router = express.Router();

// Barcha zayavkalarni olish
router.get('/', async (req, res) => {
    try {
        const { search, status, from_date, to_date } = req.query;
        let where = {};

        if (search) {
            where[Op.or] = [
                { client_name: { [Op.iLike]: `%${search}%` } },
                { phone: { [Op.iLike]: `%${search}%` } },
                { product_name: { [Op.iLike]: `%${search}%` } },
            ];
        }

        if (status) {
            where.status = status;
        }

        if (from_date && to_date) {
            where.expected_date = {
                [Op.between]: [new Date(from_date), new Date(to_date)],
            };
        } else if (from_date) {
            where.expected_date = {
                [Op.gte]: new Date(from_date),
            };
        } else if (to_date) {
            where.expected_date = {
                [Op.lte]: new Date(to_date),
            };
        }

        const requests = await Request.findAll({
            where,
            include: [
                { model: User, as: 'creator', attributes: ['id', 'full_name'] },
                { model: Product, as: 'product', attributes: ['id', 'name', 'unit', 'price'] },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(requests);
    } catch (error) {
        console.error('Zayavkalarni olishda xatolik:', error);
        res.status(500).json({ message: 'Server xatosi', error: error.message });
    }
});

// Bitta zayavkani olish
router.get('/:id', async (req, res) => {
    try {
        const request = await Request.findByPk(req.params.id, {
            include: [
                { model: User, as: 'creator', attributes: ['id', 'full_name'] },
                { model: Product, as: 'product', attributes: ['id', 'name', 'unit', 'price'] },
            ],
        });

        if (!request) {
            return res.status(404).json({ message: 'Zayavka topilmadi' });
        }

        res.json(request);
    } catch (error) {
        console.error('Zayavkani olishda xatolik:', error);
        res.status(500).json({ message: 'Server xatosi', error: error.message });
    }
});

// Yangi zayavka yaratish
router.post('/', async (req, res) => {
    try {
        const {
            client_name,
            phone,
            product_id,
            product_name,
            quantity,
            expected_date,
            notes,
        } = req.body;

        const newRequest = await Request.create({
            client_name,
            phone,
            product_id: product_id || null,
            product_name,
            quantity: parseFloat(quantity) || 0,
            expected_date: expected_date ? new Date(expected_date) : null,
            notes,
            status: 'pending',
            created_by: req.user.id,
        });

        const createdRequest = await Request.findByPk(newRequest.id, {
            include: [
                { model: User, as: 'creator', attributes: ['id', 'full_name'] },
                { model: Product, as: 'product', attributes: ['id', 'name', 'unit', 'price'] },
            ]
        });

        res.status(201).json(createdRequest);
    } catch (error) {
        console.error('Zayavka yaratishda xatolik:', error);
        res.status(500).json({ message: 'Server xatosi', error: error.message });
    }
});

// Zayavkani yangilash (asosan status o'zgartirish uchun)
router.put('/:id', async (req, res) => {
    try {
        const {
            client_name,
            phone,
            product_id,
            product_name,
            quantity,
            expected_date,
            status,
            notes,
        } = req.body;

        const request = await Request.findByPk(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Zayavka topilmadi' });
        }

        await request.update({
            client_name: client_name !== undefined ? client_name : request.client_name,
            phone: phone !== undefined ? phone : request.phone,
            product_id: product_id !== undefined ? (product_id || null) : request.product_id,
            product_name: product_name !== undefined ? product_name : request.product_name,
            quantity: quantity !== undefined ? parseFloat(quantity) : request.quantity,
            expected_date: expected_date !== undefined ? (expected_date ? new Date(expected_date) : null) : request.expected_date,
            status: status !== undefined ? status : request.status,
            notes: notes !== undefined ? notes : request.notes,
        });

        const updatedRequest = await Request.findByPk(request.id, {
            include: [
                { model: User, as: 'creator', attributes: ['id', 'full_name'] },
                { model: Product, as: 'product', attributes: ['id', 'name', 'unit', 'price'] },
            ]
        });

        res.json(updatedRequest);
    } catch (error) {
        console.error('Zayavkani yangilashda xatolik:', error);
        res.status(500).json({ message: 'Server xatosi', error: error.message });
    }
});

// Zayavkani o'chirish
router.delete('/:id', async (req, res) => {
    try {
        const request = await Request.findByPk(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Zayavka topilmadi' });
        }

        await request.destroy();
        res.json({ message: 'Zayavka muvaffaqiyatli o\'chirildi' });
    } catch (error) {
        console.error('Zayavkani o\'chirishda xatolik:', error);
        res.status(500).json({ message: 'Server xatosi', error: error.message });
    }
});

export default router;
