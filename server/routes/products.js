import { Router } from 'express';
import { Product, Category, StockMovement } from '../models/index.js';

const router = Router();

// GET /api/products
router.get('/', async (req, res) => {
    try {
        const { search, category_id } = req.query;
        const where = {};
        if (search) {
            const { Op } = (await import('sequelize')).default;
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { sku: { [Op.iLike]: `%${search}%` } },
            ];
        }
        if (category_id) where.category_id = category_id;

        const products = await Product.findAll({
            where,
            include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'color'] }],
            order: [['createdAt', 'DESC']],
        });
        res.json(products);
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Mahsulotlarni olishda xatolik' });
    }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id, {
            include: [{ model: Category, as: 'category' }],
        });
        if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// POST /api/products
router.post('/', async (req, res) => {
    try {
        const { name, sku, barcode, unit, price, min_stock, current_stock, location, image_url, category_id } = req.body;
        if (!name || !sku) {
            return res.status(400).json({ error: 'Nom va SKU kiritilishi shart' });
        }

        const existing = await Product.findOne({ where: { sku } });
        if (existing) return res.status(400).json({ error: 'Bu SKU allaqachon mavjud' });

        const product = await Product.create({
            name, sku, barcode, unit: unit || 'dona', price: price || 0,
            min_stock: min_stock || 0, current_stock: current_stock || 0,
            location, image_url, category_id,
        });

        // If initial stock > 0, create an IN movement
        if (current_stock && parseFloat(current_stock) > 0) {
            await StockMovement.create({
                product_id: product.id,
                movement_type: 'IN',
                quantity: parseFloat(current_stock),
                unit_price: price || 0,
                total_amount: parseFloat(current_stock) * parseFloat(price || 0),
                paid_amount: parseFloat(current_stock) * parseFloat(price || 0),
                notes: 'Boshlang\'ich qoldiq',
                created_by: req.user?.id || 1,
            });
        }

        const fullProduct = await Product.findByPk(product.id, {
            include: [{ model: Category, as: 'category' }],
        });
        res.status(201).json(fullProduct);
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Mahsulot yaratishda xatolik' });
    }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });

        const { name, sku, barcode, unit, price, min_stock, location, image_url, category_id } = req.body;
        await product.update({ name, sku, barcode, unit, price, min_stock, location, image_url, category_id });

        const updated = await Product.findByPk(product.id, {
            include: [{ model: Category, as: 'category' }],
        });
        res.json(updated);
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Mahsulotni yangilashda xatolik' });
    }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });
        await product.destroy();
        res.json({ message: 'Mahsulot o\'chirildi' });
    } catch (error) {
        res.status(500).json({ error: 'Mahsulotni o\'chirishda xatolik' });
    }
});

export default router;
