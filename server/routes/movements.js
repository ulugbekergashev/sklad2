import { Router } from 'express';
import { StockMovement, Product, Debt, Supplier, User } from '../models/index.js';
import sequelize from '../config/database.js';

const router = Router();

// GET /api/movements
router.get('/', async (req, res) => {
    try {
        const { type, from, to } = req.query;
        const where = {};
        if (type) where.movement_type = type;
        if (from || to) {
            const { Op } = (await import('sequelize')).default;
            where.createdAt = {};
            if (from) where.createdAt[Op.gte] = new Date(from);
            if (to) where.createdAt[Op.lte] = new Date(to + 'T23:59:59');
        }

        const movements = await StockMovement.findAll({
            where,
            include: [
                { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'unit'] },
                { model: User, as: 'creator', attributes: ['id', 'full_name'] },
                { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
                { model: Debt, as: 'debt' },
            ],
            order: [['createdAt', 'DESC']],
        });
        res.json(movements);
    } catch (error) {
        console.error('Get movements error:', error);
        res.status(500).json({ error: 'Tranzaksiyalarni olishda xatolik' });
    }
});

// POST /api/movements — Core business logic: IN/OUT with auto-debt
router.post('/', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            product_id, movement_type, quantity, unit_price,
            paid_amount, notes, supplier_id, counterparty_name, counterparty_phone
        } = req.body;

        if (!product_id || !movement_type || !quantity) {
            await t.rollback();
            return res.status(400).json({ error: 'Mahsulot, turi va miqdori kiritilishi shart' });
        }

        const product = await Product.findByPk(product_id, { transaction: t });
        if (!product) {
            await t.rollback();
            return res.status(404).json({ error: 'Mahsulot topilmadi' });
        }

        const qty = parseFloat(quantity);
        const price = parseFloat(unit_price || 0);
        const totalAmount = qty * price;
        const paidAmt = parseFloat(paid_amount || 0);

        // OUT validation: check if enough stock
        if (movement_type === 'OUT') {
            if (qty > parseFloat(product.current_stock)) {
                await t.rollback();
                return res.status(400).json({
                    error: `Yetarli zaxira yo'q! Omborda: ${product.current_stock} ${product.unit}`,
                });
            }
        }

        // Create movement
        const movement = await StockMovement.create({
            product_id,
            movement_type,
            quantity: qty,
            unit_price: price,
            total_amount: totalAmount,
            paid_amount: paidAmt,
            notes,
            supplier_id: supplier_id || null,
            counterparty_name,
            created_by: req.user?.id || 1,
        }, { transaction: t });

        // Update product stock
        const newStock = movement_type === 'IN'
            ? parseFloat(product.current_stock) + qty
            : parseFloat(product.current_stock) - qty;
        await product.update({ current_stock: newStock }, { transaction: t });

        // Auto-create debt if paid_amount < total_amount
        let debt = null;
        if (paidAmt < totalAmount) {
            const debtAmount = totalAmount - paidAmt;
            debt = await Debt.create({
                movement_id: movement.id,
                debt_type: movement_type === 'IN' ? 'payable' : 'receivable',
                counterparty_name: counterparty_name || (movement_type === 'IN' ? 'Yetkazib beruvchi' : 'Mijoz'),
                counterparty_phone: counterparty_phone || null,
                total_amount: debtAmount,
                paid_amount: 0,
                remaining_amount: debtAmount,
                status: 'active',
                description: `${product.name} - ${qty} ${product.unit} ${movement_type === 'IN' ? 'kirim' : 'chiqim'}`,
                created_by: req.user?.id || 1,
            }, { transaction: t });
        }

        await t.commit();

        const fullMovement = await StockMovement.findByPk(movement.id, {
            include: [
                { model: Product, as: 'product' },
                { model: Debt, as: 'debt' },
            ],
        });

        res.status(201).json({ movement: fullMovement, debt });
    } catch (error) {
        await t.rollback();
        console.error('Create movement error:', error);
        res.status(500).json({ error: 'Tranzaksiya yaratishda xatolik' });
    }
});

export default router;
