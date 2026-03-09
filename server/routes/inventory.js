import { Router } from 'express';
import { InventoryCheck, InventoryItem, Product } from '../models/index.js';
import sequelize from '../config/database.js';

const router = Router();

// GET /api/inventory — Get all inventory checks
router.get('/', async (req, res) => {
    try {
        const checks = await InventoryCheck.findAll({
            include: [{ model: InventoryItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
            order: [['createdAt', 'DESC']],
        });
        res.json(checks);
    } catch (error) {
        res.status(500).json({ error: 'Inventarizatsiyalarni olishda xatolik' });
    }
});

// POST /api/inventory/start — Start new inventory check
router.post('/start', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const check = await InventoryCheck.create({
            status: 'in_progress',
            created_by: req.user?.id || 1,
        }, { transaction: t });

        // Create an inventory item for each product
        const products = await Product.findAll({ transaction: t });
        const items = products.map(p => ({
            check_id: check.id,
            product_id: p.id,
            system_quantity: parseFloat(p.current_stock),
            actual_quantity: null,
            difference: 0,
        }));

        await InventoryItem.bulkCreate(items, { transaction: t });
        await t.commit();

        const fullCheck = await InventoryCheck.findByPk(check.id, {
            include: [{ model: InventoryItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
        });
        res.status(201).json(fullCheck);
    } catch (error) {
        await t.rollback();
        console.error('Start inventory error:', error);
        res.status(500).json({ error: 'Inventarizatsiya boshlashda xatolik' });
    }
});

// PUT /api/inventory/:id/items — Update actual quantities
router.put('/:id/items', async (req, res) => {
    try {
        const { items } = req.body; // Array of { id, actual_quantity }

        for (const item of items) {
            const invItem = await InventoryItem.findByPk(item.id);
            if (invItem) {
                const actual = parseFloat(item.actual_quantity || 0);
                const diff = actual - parseFloat(invItem.system_quantity);
                await invItem.update({
                    actual_quantity: actual,
                    difference: diff,
                    notes: item.notes || null,
                });
            }
        }

        const check = await InventoryCheck.findByPk(req.params.id, {
            include: [{ model: InventoryItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
        });
        res.json(check);
    } catch (error) {
        console.error('Update inventory items error:', error);
        res.status(500).json({ error: 'Inventarizatsiya ma\'lumotlarini yangilashda xatolik' });
    }
});

// POST /api/inventory/:id/complete — Finalize inventory: update product stocks
router.post('/:id/complete', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const check = await InventoryCheck.findByPk(req.params.id, {
            include: [{ model: InventoryItem, as: 'items' }],
            transaction: t,
        });

        if (!check) {
            await t.rollback();
            return res.status(404).json({ error: 'Inventarizatsiya topilmadi' });
        }

        if (check.status === 'completed') {
            await t.rollback();
            return res.status(400).json({ error: 'Bu inventarizatsiya allaqachon yakunlangan' });
        }

        // Update product stocks based on actual quantities
        for (const item of check.items) {
            if (item.actual_quantity !== null) {
                await Product.update(
                    { current_stock: parseFloat(item.actual_quantity) },
                    { where: { id: item.product_id }, transaction: t }
                );
            }
        }

        await check.update({
            status: 'completed',
            completed_at: new Date(),
        }, { transaction: t });

        await t.commit();

        const fullCheck = await InventoryCheck.findByPk(check.id, {
            include: [{ model: InventoryItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
        });
        res.json(fullCheck);
    } catch (error) {
        await t.rollback();
        console.error('Complete inventory error:', error);
        res.status(500).json({ error: 'Inventarizatsiyani yakunlashda xatolik' });
    }
});

export default router;
