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

        let startDate = null;
        let endDate = null;
        const now = new Date();
        
        if (qStart && qEnd) {
            startDate = new Date(qStart);
            endDate = new Date(qEnd);
            endDate.setHours(23, 59, 59, 999);
        } else {
            // Default to last 30 days
            startDate = new Date(now.setDate(now.getDate() - 30));
        }
        
        console.log('Final range:', { startDate, endDate });

        const whereWithDates = (baseWhere = {}) => {
            if (qStart && qEnd) {
                // Fronteddan kelayotgan '2026-03-13' formatini to'g'ri qabul qilish
                const start = new Date(qStart + 'T00:00:00Z');
                const end = new Date(qEnd + 'T23:59:59Z');
                
                return { ...baseWhere, createdAt: { [Op.gte]: start, [Op.lte]: end } };
            }
            return baseWhere;
        };

        // 1. Absolute Stats (Current state - regardless of period)
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

        // Bugungi savdo (Today's Sales - OUT) - Always show today's
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todaySalesValue = await StockMovement.findOne({
            where: {
                movement_type: 'OUT',
                createdAt: { [Op.gte]: todayStart }
            },
            attributes: [[fn('SUM', col('total_amount')), 'today_sales']],
            raw: true,
        });

        // 2. Periodical Stats (Based on selected period)
        
        // Revenue (OUT)
        const revenue = await StockMovement.sum('total_amount', {
            where: whereWithDates({ movement_type: 'OUT' })
        }) || 0;

        // Expense (IN)
        const expense = await StockMovement.sum('total_amount', {
            where: whereWithDates({ movement_type: 'IN' })
        }) || 0;

        const netProfit = (parseFloat(revenue) - parseFloat(expense));

        // Requests in period
        const periodicalRequests = await Request.count({
            where: whereWithDates({})
        });

        // Debt collected in period
        const periodicalDebtCollected = await DebtPayment.sum('amount', {
            where: whereWithDates({})
        }) || 0;

        // Products added in period
        const periodicalProductsAdded = await Product.count({
            where: whereWithDates({})
        });

        // Returns in period
        const periodicalReturns = await StockMovement.count({
            where: whereWithDates({ movement_type: 'RETURN' })
        });

        // Pending Requests (Current state)
        const pendingRequests = await Request.count({
            where: { status: 'pending' }
        });

        const isLongPeriod = false; // We can determine this based on range if needed
        const dateFormat = 'YYYY-MM-DD';

        const movements = await StockMovement.findAll({
            where: whereWithDates({}),
            attributes: [
                [fn('DATE', col('createdAt')), 'date'],
                'movement_type',
                [fn('SUM', col('total_amount')), 'total'],
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

        // Top 5 sotilgan mahsulotlar for period
        const topProductsData = await StockMovement.findAll({
            where: whereWithDates({ movement_type: 'OUT' }),
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

        const responseData = {
            totalProducts,
            stockValue: parseFloat(stockValue?.total_value || 0),
            lowStockCount: lowStockProducts.length,
            lowStockProducts,
            totalReceivable: parseFloat(activeDebts?.total_receivable || 0),
            totalPayable: parseFloat(payableDebts?.total_payable || 0),
            todaySales: parseFloat(todaySalesValue?.today_sales || 0),
            pendingRequests,
            topProducts,
            chartData,
            revenue: parseFloat(revenue),
            expense: parseFloat(expense),
            netProfit,
            requests: periodicalRequests,
            debtCollected: parseFloat(periodicalDebtCollected),
            productsAdded: periodicalProductsAdded,
            returnsCount: periodicalReturns,
        };

        console.log('--- SERVER RESPONSE START ---');
        console.log(JSON.stringify(responseData, null, 2));
        console.log('--- SERVER RESPONSE END ---');

        res.json(responseData);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Dashboard ma\'lumotlarini olishda xatolik' });
    }
});

export default router;
