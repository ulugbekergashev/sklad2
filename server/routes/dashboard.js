import { Router } from 'express';
import { Product, StockMovement, Debt, Request, DebtPayment } from '../models/index.js';
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

        // Bugungi savdo (Today's Sales - OUT)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaySales = await StockMovement.findOne({
            where: {
                movement_type: 'OUT',
                createdAt: { [Op.gte]: today }
            },
            attributes: [[fn('SUM', col('total_amount')), 'today_sales']],
            raw: true,
        });

        // Kutilayotgan Zayavkalar (Pending Requests)
        const pendingRequests = await Request.count({
            where: { status: 'pending' }
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

        // 1-month revenue
        const monthlyRevenue = await StockMovement.findOne({
            where: {
                movement_type: 'OUT',
                createdAt: { [Op.gte]: thirtyDaysAgo }
            },
            attributes: [[fn('SUM', col('total_amount')), 'monthly_revenue']],
            raw: true,
        });

        // 1-month expense
        const monthlyExpense = await StockMovement.findOne({
            where: {
                movement_type: 'IN',
                createdAt: { [Op.gte]: thirtyDaysAgo }
            },
            attributes: [[fn('SUM', col('total_amount')), 'monthly_expense']],
            raw: true,
        });

        const monthlyNetProfit = (parseFloat(monthlyRevenue?.monthly_revenue || 0) - parseFloat(monthlyExpense?.monthly_expense || 0));

        // 1-month requests
        const monthlyRequests = await Request.count({
            where: { createdAt: { [Op.gte]: thirtyDaysAgo } }
        });

        // 1-month debt collected
        const monthlyDebtCollected = await DebtPayment.findOne({
            where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
            attributes: [[fn('SUM', col('amount')), 'monthly_debt_collected']],
            raw: true,
        });

        // 1-month products added
        const monthlyProductsAdded = await Product.count({
            where: { createdAt: { [Op.gte]: thirtyDaysAgo } }
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

        // Top 5 sotilgan mahsulotlar (oxirgi 30 kun)
        const topProductsData = await StockMovement.findAll({
            where: {
                movement_type: 'OUT',
                createdAt: { [Op.gte]: thirtyDaysAgo }
            },
            attributes: ['product_id', [fn('SUM', col('quantity')), 'total_quantity']],
            group: ['product_id'],
            order: [[literal('total_quantity'), 'DESC']],
            limit: 5,
            raw: true,
        });

        let topProducts = [];
        if (topProductsData.length > 0) {
            const topProductIds = topProductsData.map(p => p.product_id);
            const topProductsDetails = await Product.findAll({
                where: { id: { [Op.in]: topProductIds } },
                attributes: ['id', 'name', 'unit'],
                raw: true,
            });

            topProducts = topProductsData.map(tp => {
                const product = topProductsDetails.find(p => p.id === tp.product_id);
                return {
                    id: tp.product_id,
                    name: product?.name || 'Noma\'lum mahsulot',
                    unit: product?.unit || 'dona',
                    total_quantity: parseFloat(tp.total_quantity)
                };
            });
        }

        res.json({
            totalProducts,
            stockValue: parseFloat(stockValue?.total_value || 0),
            lowStockCount: lowStockProducts.length,
            lowStockProducts,
            totalReceivable: parseFloat(activeDebts?.total_receivable || 0),
            totalPayable: parseFloat(payableDebts?.total_payable || 0),
            todaySales: parseFloat(todaySales?.today_sales || 0),
            pendingRequests,
            topProducts,
            chartData,
            monthlyRevenue: parseFloat(monthlyRevenue?.monthly_revenue || 0),
            monthlyExpense: parseFloat(monthlyExpense?.monthly_expense || 0),
            monthlyNetProfit,
            monthlyRequests,
            monthlyDebtCollected: parseFloat(monthlyDebtCollected?.monthly_debt_collected || 0),
            monthlyProductsAdded,
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Dashboard ma\'lumotlarini olishda xatolik' });
    }
});

export default router;
