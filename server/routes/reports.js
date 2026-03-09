import { Router } from 'express';
import { StockMovement, Product, User, Supplier } from '../models/index.js';
import ExcelJS from 'exceljs';

const router = Router();

// GET /api/reports/movements — Filtered movement list
router.get('/movements', async (req, res) => {
    try {
        const { from, to, type } = req.query;
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
            ],
            order: [['createdAt', 'DESC']],
        });
        res.json(movements);
    } catch (error) {
        console.error('Reports movements error:', error);
        res.status(500).json({ error: 'Hisobotlarni olishda xatolik' });
    }
});

// GET /api/reports/export — Export movements as Excel
router.get('/export', async (req, res) => {
    try {
        const { from, to, type } = req.query;
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
                { model: Product, as: 'product' },
                { model: User, as: 'creator' },
            ],
            order: [['createdAt', 'DESC']],
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Hisobot');

        sheet.columns = [
            { header: '№', key: 'index', width: 6 },
            { header: 'Sana', key: 'date', width: 20 },
            { header: 'Mahsulot', key: 'product', width: 25 },
            { header: 'SKU', key: 'sku', width: 15 },
            { header: 'Turi', key: 'type', width: 10 },
            { header: 'Miqdor', key: 'quantity', width: 12 },
            { header: 'Narxi', key: 'price', width: 15 },
            { header: 'Jami', key: 'total', width: 18 },
            { header: 'To\'langan', key: 'paid', width: 18 },
            { header: 'Kontragent', key: 'counterparty', width: 20 },
            { header: 'Xodim', key: 'creator', width: 20 },
        ];

        // Style header row
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' },
        };
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        movements.forEach((m, i) => {
            sheet.addRow({
                index: i + 1,
                date: new Date(m.createdAt).toLocaleString('uz-UZ'),
                product: m.product?.name || '-',
                sku: m.product?.sku || '-',
                type: m.movement_type === 'IN' ? 'Kirim' : 'Chiqim',
                quantity: parseFloat(m.quantity),
                price: parseFloat(m.unit_price),
                total: parseFloat(m.total_amount),
                paid: parseFloat(m.paid_amount),
                counterparty: m.counterparty_name || '-',
                creator: m.creator?.full_name || '-',
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sklad_hisobot.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Eksport qilishda xatolik' });
    }
});

export default router;
