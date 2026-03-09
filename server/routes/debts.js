import { Router } from 'express';
import { Debt, DebtPayment, StockMovement, Product } from '../models/index.js';
import sequelize from '../config/database.js';

const router = Router();

// GET /api/debts
router.get('/', async (req, res) => {
    try {
        const { type, status } = req.query;
        const where = {};
        if (type) where.debt_type = type;
        if (status) where.status = status;

        const debts = await Debt.findAll({
            where,
            include: [
                {
                    model: StockMovement, as: 'movement',
                    include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }],
                },
                { model: DebtPayment, as: 'payments' },
            ],
            order: [['createdAt', 'DESC']],
        });
        res.json(debts);
    } catch (error) {
        console.error('Get debts error:', error);
        res.status(500).json({ error: 'Qarzlarni olishda xatolik' });
    }
});

// POST /api/debts — Create manual debt
router.post('/', async (req, res) => {
    try {
        const { debt_type, counterparty_name, counterparty_phone, total_amount, due_date, description } = req.body;
        if (!counterparty_name || !total_amount || !debt_type) {
            return res.status(400).json({ error: 'Kontragent nomi, summa va qarz turi kiritilishi shart' });
        }

        const amount = parseFloat(total_amount);
        const debt = await Debt.create({
            debt_type,
            counterparty_name,
            counterparty_phone,
            total_amount: amount,
            paid_amount: 0,
            remaining_amount: amount,
            status: 'active',
            due_date: due_date || null,
            description,
            created_by: req.user?.id || 1,
        });

        res.status(201).json(debt);
    } catch (error) {
        console.error('Create debt error:', error);
        res.status(500).json({ error: 'Qarz yaratishda xatolik' });
    }
});

// POST /api/debts/:id/pay — Record a payment
router.post('/:id/pay', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const debt = await Debt.findByPk(req.params.id, { transaction: t });
        if (!debt) {
            await t.rollback();
            return res.status(404).json({ error: 'Qarz topilmadi' });
        }

        const { amount, payment_method, notes } = req.body;
        const payAmount = parseFloat(amount);

        if (!payAmount || payAmount <= 0) {
            await t.rollback();
            return res.status(400).json({ error: 'To\'lov summasi noto\'g\'ri' });
        }

        if (payAmount > parseFloat(debt.remaining_amount)) {
            await t.rollback();
            return res.status(400).json({ error: 'To\'lov summasi qarz qoldig\'idan oshib ketdi' });
        }

        // Create payment record
        await DebtPayment.create({
            debt_id: debt.id,
            amount: payAmount,
            payment_method: payment_method || 'naqd',
            notes,
        }, { transaction: t });

        // Update debt
        const newPaid = parseFloat(debt.paid_amount) + payAmount;
        const newRemaining = parseFloat(debt.total_amount) - newPaid;
        const newStatus = newRemaining <= 0 ? 'paid' : 'active';

        await debt.update({
            paid_amount: newPaid,
            remaining_amount: Math.max(0, newRemaining),
            status: newStatus,
        }, { transaction: t });

        await t.commit();

        const updatedDebt = await Debt.findByPk(debt.id, {
            include: [{ model: DebtPayment, as: 'payments' }],
        });
        res.json(updatedDebt);
    } catch (error) {
        await t.rollback();
        console.error('Pay debt error:', error);
        res.status(500).json({ error: 'To\'lov kiritishda xatolik' });
    }
});

export default router;
