import { Product, Debt, StockMovement, DebtPayment } from '../models/index.js';
import sequelize from '../config/database.js';

/**
 * AI response ni tahlil qilib, ombor operatsiyalarini bajaradi
 * @param {Object} aiResponse - AI dan kelgan JSON action
 * @param {string} originalMessage - Foydalanuvchi xabari
 * @param {number} userId - User ID
 * @returns {Object} - Natija xabari
 */
export async function executeAction(aiResponse, originalMessage, userId = 1) {
    let result = { ...aiResponse };

    if (aiResponse.action === 'incoming' || aiResponse.action === 'outgoing') {
        const product = await Product.findOne({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('name')),
                sequelize.fn('LOWER', aiResponse.product_name)
            ),
        });

        if (!product) {
            return { action: 'info', message: `"${aiResponse.product_name}" nomli mahsulot omborda topilmadi.` };
        }

        const qty = parseFloat(aiResponse.quantity || 0);
        const unitPrice = parseFloat(aiResponse.unit_price || product.price || 0);
        const totalAmount = qty * unitPrice;
        const paidAmount = parseFloat(aiResponse.paid_amount ?? totalAmount);
        const movementType = aiResponse.action === 'incoming' ? 'IN' : 'OUT';

        if (movementType === 'OUT' && qty > parseFloat(product.current_stock)) {
            return {
                action: 'info',
                message: `Yetarli zaxira yo'q! ${product.name} omborda: ${product.current_stock} ${product.unit}`,
            };
        }

        const t = await sequelize.transaction();
        try {
            const movement = await StockMovement.create({
                product_id: product.id,
                movement_type: movementType,
                quantity: qty,
                unit_price: unitPrice,
                total_amount: totalAmount,
                paid_amount: paidAmount,
                counterparty_name: aiResponse.counterparty_name,
                notes: `Telegram AI: ${originalMessage}`,
                created_by: userId,
            }, { transaction: t });

            const newStock = movementType === 'IN'
                ? parseFloat(product.current_stock) + qty
                : parseFloat(product.current_stock) - qty;
            await product.update({ current_stock: newStock }, { transaction: t });

            if (paidAmount < totalAmount) {
                const debtAmount = totalAmount - paidAmount;
                await Debt.create({
                    movement_id: movement.id,
                    debt_type: movementType === 'IN' ? 'payable' : 'receivable',
                    counterparty_name: aiResponse.counterparty_name || 'Noma\'lum',
                    total_amount: debtAmount,
                    paid_amount: 0,
                    remaining_amount: debtAmount,
                    status: 'active',
                    description: `Telegram: ${product.name} ${qty} ${product.unit}`,
                    created_by: userId,
                }, { transaction: t });

                result.debtCreated = debtAmount;
            }

            await t.commit();
            result.executed = true;
            result.productName = product.name;
            result.newStock = newStock;
            result.unit = product.unit;
        } catch (err) {
            await t.rollback();
            console.error('Telegram action error:', err);
            return { action: 'info', message: 'Amaliyotni bajarishda xatolik yuz berdi.' };
        }

    } else if (aiResponse.action === 'payment') {
        const { Op } = await import('sequelize');
        const debt = await Debt.findOne({
            where: {
                status: 'active',
                counterparty_name: { [Op.iLike]: `%${aiResponse.counterparty_name}%` },
            },
        });

        if (!debt) {
            return { action: 'info', message: `"${aiResponse.counterparty_name}" nomiga aktiv qarz topilmadi.` };
        }

        const payAmt = Math.min(parseFloat(aiResponse.amount || 0), parseFloat(debt.remaining_amount));
        const t = await sequelize.transaction();
        try {
            await DebtPayment.create({
                debt_id: debt.id,
                amount: payAmt,
                payment_method: 'naqd',
                notes: `Telegram AI: ${originalMessage}`,
            }, { transaction: t });

            const newPaid = parseFloat(debt.paid_amount) + payAmt;
            const newRemaining = Math.max(0, parseFloat(debt.total_amount) - newPaid);
            await debt.update({
                paid_amount: newPaid,
                remaining_amount: newRemaining,
                status: newRemaining <= 0 ? 'paid' : 'active',
            }, { transaction: t });

            await t.commit();
            result.executed = true;
            result.debtPaid = payAmt;
            result.debtRemaining = newRemaining;
            result.counterparty = debt.counterparty_name;
        } catch (err) {
            await t.rollback();
            return { action: 'info', message: 'To\'lovni amalga oshirishda xatolik.' };
        }

    } else if (aiResponse.action === 'add_product') {
        try {
            const sku = aiResponse.sku || `SKU-${Date.now()}`;
            const product = await Product.create({
                name: aiResponse.name,
                sku,
                unit: aiResponse.unit || 'dona',
                price: parseFloat(aiResponse.price || 0),
                current_stock: parseFloat(aiResponse.initial_stock || 0),
                min_stock: 0,
            });

            if (parseFloat(aiResponse.initial_stock || 0) > 0) {
                await StockMovement.create({
                    product_id: product.id,
                    movement_type: 'IN',
                    quantity: parseFloat(aiResponse.initial_stock),
                    unit_price: parseFloat(aiResponse.price || 0),
                    total_amount: parseFloat(aiResponse.initial_stock) * parseFloat(aiResponse.price || 0),
                    paid_amount: parseFloat(aiResponse.initial_stock) * parseFloat(aiResponse.price || 0),
                    notes: 'Telegram AI orqali qo\'shildi',
                    created_by: userId,
                });
            }
            result.executed = true;
            result.productName = product.name;
            result.productSku = sku;
        } catch (err) {
            return { action: 'info', message: 'Mahsulot qo\'shishda xatolik.' };
        }
    } else if (aiResponse.action === 'request') {
        try {
            const { Request, Product } = await import('../models/index.js');
            // Mahsulotni izlash (ixtiyoriy)
            let productId = null;
            if (aiResponse.product_name) {
                const product = await Product.findOne({
                    where: sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('name')),
                        sequelize.fn('LOWER', aiResponse.product_name)
                    ),
                });
                if (product) productId = product.id;
            }

            const request = await Request.create({
                client_name: aiResponse.client_name || 'Noma\'lum',
                phone: aiResponse.phone || null,
                product_id: productId,
                product_name: aiResponse.product_name,
                quantity: parseFloat(aiResponse.quantity || 0),
                expected_date: aiResponse.expected_date ? new Date(aiResponse.expected_date) : null,
                notes: `Telegram AI: ${originalMessage}`,
                status: 'pending',
                created_by: userId,
            });

            result.executed = true;
            result.clientName = request.client_name;
            result.productName = aiResponse.product_name;
            result.quantity = request.quantity;
        } catch (err) {
            console.error('Request action error:', err);
            return { action: 'info', message: 'Zayavka yaratishda xatolik.' };
        }
    }

    return result;
}

/**
 * Tasdiqlash xabarini generatsiya qiladi
 */
export function buildConfirmationMessage(aiResponse) {
    const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(n || 0);

    if (aiResponse.action === 'incoming') {
        const qty = parseFloat(aiResponse.quantity || 0);
        const price = parseFloat(aiResponse.unit_price || 0);
        const total = qty * price;
        const paid = parseFloat(aiResponse.paid_amount ?? total);
        const debt = Math.max(0, total - paid);

        let msg = `📥 *Kirim qilish*\n\n`;
        msg += `📦 Mahsulot: *${aiResponse.product_name}*\n`;
        msg += `📏 Miqdor: *${qty}*\n`;
        msg += `💰 Narxi: *${fmt(price)}* so'm\n`;
        msg += `💵 Jami: *${fmt(total)}* so'm\n`;
        if (aiResponse.counterparty_name) msg += `👤 Yetkazuvchi: *${aiResponse.counterparty_name}*\n`;
        if (paid < total) {
            msg += `💳 To'langan: *${fmt(paid)}* so'm\n`;
            msg += `⚠️ Qarz: *${fmt(debt)}* so'm\n`;
        }
        msg += `\n*Shuni bajarishni xohlaysizmi?*`;
        return msg;
    }

    if (aiResponse.action === 'outgoing') {
        const qty = parseFloat(aiResponse.quantity || 0);
        const price = parseFloat(aiResponse.unit_price || 0);
        const total = qty * price;
        const paid = parseFloat(aiResponse.paid_amount ?? total);
        const debt = Math.max(0, total - paid);

        let msg = `📤 *Chiqim qilish*\n\n`;
        msg += `📦 Mahsulot: *${aiResponse.product_name}*\n`;
        msg += `📏 Miqdor: *${qty}*\n`;
        msg += `💰 Narxi: *${fmt(price)}* so'm\n`;
        msg += `💵 Jami: *${fmt(total)}* so'm\n`;
        if (aiResponse.counterparty_name) msg += `👤 Mijoz: *${aiResponse.counterparty_name}*\n`;
        if (paid < total) {
            msg += `💳 To'langan: *${fmt(paid)}* so'm\n`;
            msg += `💰 Qarz (bizga): *${fmt(debt)}* so'm\n`;
        }
        msg += `\n*Shuni bajarishni xohlaysizmi?*`;
        return msg;
    }

    if (aiResponse.action === 'payment') {
        let msg = `💳 *Qarz to'lash*\n\n`;
        msg += `👤 Kontragent: *${aiResponse.counterparty_name}*\n`;
        msg += `💵 To'lov: *${fmt(aiResponse.amount)}* so'm\n`;
        msg += `\n*Shuni bajarishni xohlaysizmi?*`;
        return msg;
    }

    if (aiResponse.action === 'add_product') {
        let msg = `➕ *Yangi mahsulot qo'shish*\n\n`;
        msg += `📦 Nomi: *${aiResponse.name}*\n`;
        if (aiResponse.unit) msg += `📏 Birlik: *${aiResponse.unit}*\n`;
        if (aiResponse.price) msg += `💰 Narxi: *${fmt(aiResponse.price)}* so'm\n`;
        if (aiResponse.initial_stock) msg += `📊 Boshlang'ich zaxira: *${aiResponse.initial_stock}*\n`;
        msg += `\n*Shuni bajarishni xohlaysizmi?*`;
        return msg;
    }

    if (aiResponse.action === 'request') {
        let msg = `📝 *Yangi zayavka (buyurtma)*\n\n`;
        msg += `👤 Mijoz: *${aiResponse.client_name || 'Noma\'lum'}*\n`;
        msg += `📦 Mahsulot: *${aiResponse.product_name || '-'}*\n`;
        msg += `📏 Miqdor: *${aiResponse.quantity || 0}*\n`;
        if (aiResponse.expected_date) msg += `📅 Sana: *${aiResponse.expected_date}*\n`;
        msg += `\n*Shuni saqlashni xohlaysizmi?*`;
        return msg;
    }

    return null;
}
