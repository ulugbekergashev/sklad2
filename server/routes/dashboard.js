import { Router } from 'express';
import { Product, StockMovement, Debt, Request, DebtPayment } from '../models/index.js';
import sequelize from '../config/database.js';
import { Op, fn, col, literal } from 'sequelize';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
    try {
        const { startDate: qStart, endDate: qEnd } = req.query;
        console.log('Dashboard stats requested with:', { qStart, qEnd });

        // Date range handling
        const start = new Date(qStart + 'T00:00:00Z');
        const end = new Date(qEnd + 'T23:59:59Z');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const wherePeriod = { createdAt: { [Op.gte]: start, [Op.lte]: end } };

        // Parallelize all main queries
        const [
            totalProducts,
            stockValueResult,
            lowStockProducts,
            activeDebts,
            payableDebts,
            todaySalesValue,
            periodMovements,
            periodRequests,
            periodDebtCollected,
            periodProductsAdded,
            pendingRequestsCount,
            topProductsData
        ] = await Promise.all([
            // 1. Current State Stats
            Product.count(),
            Product.findOne({
                attributes: [[fn('SUM', literal('"price" * "current_stock"')), 'total_value']],
                raw: true,
            }),
             Product.findAll({
                where: {
                    min_stock: { [Op.gt]: 0 },
                    current_stock: { [Op.lte]: col('min_stock') },
                },
                order: [['current_stock', 'ASC']],
            }),
            Debt.findOne({
                where: { status: 'active', debt_type: 'receivable' },
                attributes: [[fn('SUM', col('remaining_amount')), 'total_receivable']],
                raw: true,
            }),
            Debt.findOne({
                where: { status: 'active', debt_type: 'payable' },
                attributes: [[fn('SUM', col('remaining_amount')), 'total_payable']],
                raw: true,
            }),
            StockMovement.findOne({
                where: { movement_type: 'OUT', createdAt: { [Op.gte]: todayStart } },
                attributes: [[fn('SUM', col('total_amount')), 'today_sales']],
                raw: true,
            }),

            // 2. Periodical Stats (using one query for chart and totals)
            StockMovement.findAll({
                where: wherePeriod,
                attributes: [
                    [fn('DATE', col('createdAt')), 'date'],
                    'movement_type',
                    [fn('SUM', col('total_amount')), 'total'],
                ],
                group: [fn('DATE', col('createdAt')), 'movement_type'],
                order: [[fn('DATE', col('createdAt')), 'ASC']],
                raw: true,
            }),
            Request.count({ where: wherePeriod }),
            DebtPayment.sum('amount', { where: wherePeriod }),
            Product.count({ where: wherePeriod }),
            Request.count({ where: { status: 'pending' } }),

            // 3. Top Products for Period
            StockMovement.findAll({
                where: { ...wherePeriod, movement_type: 'OUT' },
                attributes: ['product_id', [fn('SUM', col('quantity')), 'total_quantity']],
                group: ['product_id'],
                order: [[literal('total_quantity'), 'DESC']],
                limit: 5,
                raw: true,
            })
        ]);

        // Process period stats from movements
        let revenue = 0;
        let expense = 0;
        let returnsCount = 0;
        const chartDataMap = {};

        periodMovements.forEach(m => {
            const date = m.date;
            const amount = parseFloat(m.total || 0);
            
            if (!chartDataMap[date]) {
                chartDataMap[date] = { date, kirim: 0, chiqim: 0 };
            }

            if (m.movement_type === 'IN') {
                expense += amount;
                chartDataMap[date].kirim = amount;
            } else if (m.movement_type === 'OUT') {
                revenue += amount;
                chartDataMap[date].chiqim = amount;
            } else if (m.movement_type === 'RETURN') {
                returnsCount++;
            }
        });

        // Resolve top product details
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

        const responseData = {
            totalProducts,
            stockValue: parseFloat(stockValueResult?.total_value || 0),
            lowStockCount: lowStockProducts.length,
            lowStockProducts,
            totalReceivable: parseFloat(activeDebts?.total_receivable || 0),
            totalPayable: parseFloat(payableDebts?.total_payable || 0),
            todaySales: parseFloat(todaySalesValue?.today_sales || 0),
            pendingRequests: pendingRequestsCount,
            topProducts,
            chartData: Object.values(chartDataMap),
            revenue,
            expense,
            netProfit: revenue - expense,
            requests: periodRequests,
            debtCollected: parseFloat(periodDebtCollected || 0),
            productsAdded: periodProductsAdded,
            returnsCount,
        };

        res.json(responseData);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Dashboard ma\'lumotlarini olishda xatolik' });
    }
});

export default router;
