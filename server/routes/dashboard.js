import { Router } from 'express';
import { Product, StockMovement, Debt, Request, DebtPayment } from '../models/index.js';
import sequelize from '../config/database.js';
import { Op, fn, col, literal } from 'sequelize';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
    try {
        const { startDate: qStart, endDate: qEnd, scope = 'all' } = req.query;
        console.log('Dashboard stats requested with:', { qStart, qEnd, scope });

        // Date range handling
        const start = new Date(qStart + 'T00:00:00Z');
        const end = new Date(qEnd + 'T23:59:59Z');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const wherePeriod = { createdAt: { [Op.gte]: start, [Op.lte]: end } };

        const queries = {
            // Global (Scope: global or all)
            global: (scope === 'global' || scope === 'all') ? [
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
                Request.count({ where: { status: 'pending' } }),
            ] : null,

            // Period (Scope: period or all)
            period: (scope === 'period' || scope === 'all') ? [
                StockMovement.findOne({
                    where: { movement_type: 'OUT', createdAt: { [Op.gte]: todayStart } },
                    attributes: [[fn('SUM', col('total_amount')), 'today_sales']],
                    raw: true,
                }),
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
                StockMovement.findAll({
                    where: { ...wherePeriod, movement_type: 'OUT' },
                    attributes: ['product_id', [fn('SUM', col('quantity')), 'total_quantity']],
                    group: ['product_id'],
                    order: [[literal('total_quantity'), 'DESC']],
                    limit: 5,
                    raw: true,
                })
            ] : null
        };

        const results = {};

        if (queries.global) {
            const [
                totalProducts, stockValueResult, lowStockProducts, 
                activeDebts, payableDebts, pendingRequestsCount
            ] = await Promise.all(queries.global);
            
            Object.assign(results, {
                totalProducts,
                stockValue: parseFloat(stockValueResult?.total_value || 0),
                lowStockCount: lowStockProducts.length,
                lowStockProducts,
                totalReceivable: parseFloat(activeDebts?.total_receivable || 0),
                totalPayable: parseFloat(payableDebts?.total_payable || 0),
                pendingRequests: pendingRequestsCount,
            });
        }

        if (queries.period) {
            const [
                todaySalesValue, periodMovements, periodRequests, 
                periodDebtCollected, periodProductsAdded, topProductsData
            ] = await Promise.all(queries.period);

            let revenue = 0;
            let expense = 0;
            let returnsCount = 0;
            const chartDataMap = {};

            periodMovements.forEach(m => {
                const date = m.date;
                const amount = parseFloat(m.total || 0);
                if (!chartDataMap[date]) chartDataMap[date] = { date, kirim: 0, chiqim: 0 };
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

            Object.assign(results, {
                todaySales: parseFloat(todaySalesValue?.today_sales || 0),
                chartData: Object.values(chartDataMap),
                revenue,
                expense,
                netProfit: revenue - expense,
                requests: periodRequests,
                debtCollected: parseFloat(periodDebtCollected || 0),
                productsAdded: periodProductsAdded,
                returnsCount,
                topProducts
            });
        }

        res.json(results);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Dashboard ma\'lumotlarini olishda xatolik' });
    }
});

export default router;
