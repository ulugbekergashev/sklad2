import express from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Request, User, Product, StockMovement } from '../models/index.js';

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
    const t = await sequelize.transaction();
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

        const request = await Request.findByPk(req.params.id, { transaction: t });

        if (!request) {
            await t.rollback();
            return res.status(404).json({ message: 'Zayavka topilmadi' });
        }

        // Agar status 'completed' ga o'zgarayotgan bo'lsa va avval 'completed' bo'lmasa
        if (status === 'completed' && request.status !== 'completed') {
            let finalProductId = product_id !== undefined ? (product_id || null) : request.product_id;
            const finalProductName = product_name !== undefined ? product_name : request.product_name;
            const finalQuantity = quantity !== undefined ? parseFloat(quantity) : parseFloat(request.quantity);

            // 1. Agar product_id yo'q bo'lsa, lekin product_name bor bo'lsa, yangi mahsulot yaratamiz
            if (!finalProductId && finalProductName) {
                // Avval shu nomli mahsulot bor-yo'qligini tekshiramiz
                let existingProduct = await Product.findOne({
                    where: sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('name')),
                        sequelize.fn('LOWER', finalProductName)
                    ),
                    transaction: t
                });

                if (existingProduct) {
                    finalProductId = existingProduct.id;
                } else {
                    // Yangi mahsulot yaratamiz
                    const newProduct = await Product.create({
                        name: finalProductName,
                        sku: `ZRV-${Date.now().toString().slice(-6)}`, // Tasodifiy SKU
                        category_id: null,
                        unit: 'dona',
                        price: 0,
                        current_stock: 0,
                        barcode: null,
                        min_stock: 10,
                    }, { transaction: t });
                    finalProductId = newProduct.id;
                }
            }

            // 2. StockMovement yaratamiz (Kirim - IN)
            if (finalProductId && finalQuantity > 0) {
                const product = await Product.findByPk(finalProductId, { transaction: t });
                if (product) {
                    await StockMovement.create({
                        product_id: finalProductId,
                        movement_type: 'IN',
                        quantity: finalQuantity,
                        unit_price: 0, // Bepul kirim (yoki zayavkadan narx olish mumkin kelajakda)
                        total_amount: 0,
                        paid_amount: 0,
                        notes: `Zayavka asosida avtomatik kirim. Bajarildi.`,
                        counterparty_name: client_name !== undefined ? client_name : request.client_name,
                        created_by: req.user.id
                    }, { transaction: t });

                    // 3. Ombor qoldig'ini yangilaymiz
                    await product.update({
                        current_stock: parseFloat(product.current_stock) + finalQuantity
                    }, { transaction: t });
                }
            }

            // Request ni o'zini yangisiga moslab saqlash (product_id endi qo'shilgan)
            await request.update({
                client_name: client_name !== undefined ? client_name : request.client_name,
                phone: phone !== undefined ? phone : request.phone,
                product_id: finalProductId, // muhim: agar yangi yaratilgan bo'lsa
                product_name: finalProductName,
                quantity: finalQuantity,
                expected_date: expected_date !== undefined ? (expected_date ? new Date(expected_date) : null) : request.expected_date,
                status: status,
                notes: notes !== undefined ? notes : request.notes,
            }, { transaction: t });

        } else {
            // Oddiy o'zgartirish (Status 'completed' ga EMAS yoki allaqachon 'completed' bo'lgan bo'lsa)
            await request.update({
                client_name: client_name !== undefined ? client_name : request.client_name,
                phone: phone !== undefined ? phone : request.phone,
                product_id: product_id !== undefined ? (product_id || null) : request.product_id,
                product_name: product_name !== undefined ? product_name : request.product_name,
                quantity: quantity !== undefined ? parseFloat(quantity) : request.quantity,
                expected_date: expected_date !== undefined ? (expected_date ? new Date(expected_date) : null) : request.expected_date,
                status: status !== undefined ? status : request.status,
                notes: notes !== undefined ? notes : request.notes,
            }, { transaction: t });
        }

        await t.commit();

        const updatedRequest = await Request.findByPk(request.id, {
            include: [
                { model: User, as: 'creator', attributes: ['id', 'full_name'] },
                { model: Product, as: 'product', attributes: ['id', 'name', 'unit', 'price'] },
            ]
        });

        res.json(updatedRequest);
    } catch (error) {
        await t.rollback();
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
