import { Router } from 'express';
import { Product, StockMovement, Debt } from '../models/index.js';
import sequelize from '../config/database.js';
import { Op, fn, col, literal } from 'sequelize';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
    try {
        // Total products count
        const totalProducts = await Product.count();

        // Total stock value
        const stockValue = await Product.findOne({
            attributes: [[fn('SUM', literal('"price" * "current_stock"')), 'total_value']],
            raw: true,
        });

        // Low stock products (current_stock <= min_stock and min_stock > 0)
        const lowStockProducts = await Product.findAll({
            where: {
                min_stock: { [Op.gt]: 0 },
                current_stock: { [Op.lte]: col('min_stock') },
            },
            order: [['current_stock', 'ASC']],
        });

        // Active debts (receivable)
        const activeDebts = await Debt.findOne({
            where: { status: 'active', debt_type: 'receivable' },
            attributes: [[fn('SUM', col('remaining_amount')), 'total_receivable']],
            raw: true,
        });

        // Active debts (payable)
        const payableDebts = await Debt.findOne({
            where: { status: 'active', debt_type: 'payable' },
            attributes: [[fn('SUM', col('remaining_amount')), 'total_payable']],
            raw: true,
        });

        // Last 30 days movements for chart
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const movements = await StockMovement.findAll({
            where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
            attributes: [
                [fn('DATE', col('createdAt')), 'date'],
                'movement_type',
                [fn('SUM', col('total_amount')), 'total'],
                [fn('COUNT', col('id')), 'count'],
            ],
            group: [fn('DATE', col('createdAt')), 'movement_type'],
            order: [[fn('DATE', col('createdAt')), 'ASC']],
            raw: true,
        });

        // Format chart data
        const chartDataMap = {};
        movements.forEach(m => {
            const date = m.date;
            if (!chartDataMap[date]) {
                chartDataMap[date] = { date, kirim: 0, chiqim: 0 };
            }
            if (m.movement_type === 'IN') {
                chartDataMap[date].kirim = parseFloat(m.total);
            } else {
                chartDataMap[date].chiqim = parseFloat(m.total);
            }
        });
        const chartData = Object.values(chartDataMap);

        res.json({
            totalProducts,
            stockValue: parseFloat(stockValue?.total_value || 0),
            lowStockCount: lowStockProducts.length,
            lowStockProducts,
            totalReceivable: parseFloat(activeDebts?.total_receivable || 0),
            totalPayable: parseFloat(payableDebts?.total_payable || 0),
            chartData,
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Dashboard ma\'lumotlarini olishda xatolik' });
    }
});

export default router;
