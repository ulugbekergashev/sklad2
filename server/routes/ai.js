import { Router } from 'express';
import { Product, Debt, StockMovement, DebtPayment } from '../models/index.js';
import sequelize from '../config/database.js';

const router = Router();

// POST /api/ai/command
router.post('/command', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Xabar kiritilishi shart' });

        // Gather context: products and active debts
        const products = await Product.findAll({
            attributes: ['id', 'name', 'sku', 'unit', 'price', 'current_stock', 'min_stock'],
            raw: true,
        });
        const debts = await Debt.findAll({
            where: { status: 'active' },
            attributes: ['id', 'counterparty_name', 'debt_type', 'total_amount', 'remaining_amount'],
            raw: true,
        });

        const productContext = products.map(p =>
            `- ${p.name} (SKU: ${p.sku}): ${p.current_stock} ${p.unit}, narxi ${p.price} so'm`
        ).join('\n');

        const debtContext = debts.map(d =>
            `- ${d.counterparty_name}: ${d.remaining_amount} so'm (${d.debt_type === 'receivable' ? 'bizga berishi kerak' : 'biz berishimiz kerak'})`
        ).join('\n');

        const systemPrompt = `Sen SKLAD WMS ombor boshqaruv tizimining AI assistentisan. Foydalanuvchi o'zbek tilida so'raydi. 
    
Hozirgi ombor holati:
MAHSULOTLAR:
${productContext || 'Hozircha mahsulot yo\'q'}

AKTIV QARZLAR:
${debtContext || 'Aktiv qarz yo\'q'}

SEN FAQAT JSON FORMATDA JAVOB BERISHING KERAK. JSON ning tuzilishi:
{
  "action": "info" | "incoming" | "outgoing" | "payment" | "add_product",
  "message": "Foydalanuvchiga beriladigan xabar (o'zbek tilida)",
  ...qo'shimcha maydonlar
}

ACTION TURLARI:
1. "info" — oddiy ma'lumot berish, savol-javob
   {"action": "info", "message": "javob matni"}

2. "incoming" — mahsulot kirim qilish
   {"action": "incoming", "product_name": "mahsulot nomi", "quantity": 10, "unit_price": 5000, "paid_amount": 50000, "counterparty_name": "yetkazib beruvchi nomi", "message": "..."}

3. "outgoing" — mahsulot chiqim qilish  
   {"action": "outgoing", "product_name": "mahsulot nomi", "quantity": 5, "unit_price": 10000, "paid_amount": 0, "counterparty_name": "mijoz nomi", "message": "..."}

4. "payment" — qarz to'lash
   {"action": "payment", "counterparty_name": "qarz egasi", "amount": 50000, "message": "..."}

5. "add_product" — yangi mahsulot qo'shish
   {"action": "add_product", "name": "mahsulot nomi", "sku": "SKU001", "unit": "dona", "price": 5000, "initial_stock": 100, "message": "..."}

MUHIM QOIDALAR:
- Har doim JSON formatda javob ber
- Mahsulot nomi bo'yicha ombordagi mahsulotni toping
- Agar mahsulot topilmasa, "info" action bilan bildiring
- paid_amount kiritilmasa yoki jami summadan kam bo'lsa, qarz yaratiladi
- O'zbek tilida javob yozing`;

        // Call OpenRouter API
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return res.json({
                action: 'info',
                message: 'AI assistent hozircha sozlanmagan. OPENROUTER_API_KEY .env faylga kiritilishi kerak.',
            });
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://sklad-wms.app',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message },
                ],
                temperature: 0.3,
                response_format: { type: 'json_object' },
            }),
        });

        const data = await response.json();
        let aiResponse;

        try {
            const content = data.choices?.[0]?.message?.content || '{}';
            aiResponse = JSON.parse(content);
        } catch (e) {
            aiResponse = { action: 'info', message: data.choices?.[0]?.message?.content || 'Javob olishda xatolik' };
        }

        // Execute action based on AI response
        let result = { ...aiResponse };

        if (aiResponse.action === 'incoming' || aiResponse.action === 'outgoing') {
            const product = await Product.findOne({
                where: sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('name')),
                    sequelize.fn('LOWER', aiResponse.product_name)
                ),
            });

            if (!product) {
                result = { action: 'info', message: `"${aiResponse.product_name}" nomli mahsulot omborda topilmadi.` };
            } else {
                const qty = parseFloat(aiResponse.quantity || 0);
                const unitPrice = parseFloat(aiResponse.unit_price || product.price || 0);
                const totalAmount = qty * unitPrice;
                const paidAmount = parseFloat(aiResponse.paid_amount ?? totalAmount);
                const movementType = aiResponse.action === 'incoming' ? 'IN' : 'OUT';

                // Check stock for outgoing
                if (movementType === 'OUT' && qty > parseFloat(product.current_stock)) {
                    result = {
                        action: 'info',
                        message: `Yetarli zaxira yo'q! ${product.name} omborda: ${product.current_stock} ${product.unit}`,
                    };
                } else {
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
                            notes: `AI orqali: ${message}`,
                            created_by: req.user?.id || 1,
                        }, { transaction: t });

                        const newStock = movementType === 'IN'
                            ? parseFloat(product.current_stock) + qty
                            : parseFloat(product.current_stock) - qty;
                        await product.update({ current_stock: newStock }, { transaction: t });

                        // Auto debt
                        if (paidAmount < totalAmount) {
                            await Debt.create({
                                movement_id: movement.id,
                                debt_type: movementType === 'IN' ? 'payable' : 'receivable',
                                counterparty_name: aiResponse.counterparty_name || 'Noma\'lum',
                                total_amount: totalAmount - paidAmount,
                                paid_amount: 0,
                                remaining_amount: totalAmount - paidAmount,
                                status: 'active',
                                description: `AI: ${product.name} ${qty} ${product.unit}`,
                                created_by: req.user?.id || 1,
                            }, { transaction: t });
                        }

                        await t.commit();
                        result.executed = true;
                    } catch (err) {
                        await t.rollback();
                        result = { action: 'info', message: 'Amaliyotni bajarishda xatolik yuz berdi.' };
                    }
                }
            }
        } else if (aiResponse.action === 'payment') {
            const debt = await Debt.findOne({
                where: {
                    status: 'active',
                    counterparty_name: { [sequelize.Op?.iLike ? 'iLike' : 'like']: `%${aiResponse.counterparty_name}%` },
                },
            });

            if (!debt) {
                result = { action: 'info', message: `"${aiResponse.counterparty_name}" nomiga aktiv qarz topilmadi.` };
            } else {
                const payAmt = parseFloat(aiResponse.amount || 0);
                const t = await sequelize.transaction();
                try {
                    await DebtPayment.create({
                        debt_id: debt.id,
                        amount: Math.min(payAmt, parseFloat(debt.remaining_amount)),
                        payment_method: 'naqd',
                        notes: `AI orqali: ${message}`,
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
                } catch (err) {
                    await t.rollback();
                    result = { action: 'info', message: 'To\'lovni amalga oshirishda xatolik.' };
                }
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
                        notes: 'AI orqali qo\'shildi',
                        created_by: req.user?.id || 1,
                    });
                }
                result.executed = true;
            } catch (err) {
                result = { action: 'info', message: 'Mahsulot qo\'shishda xatolik.' };
            }
        }

        res.json(result);
    } catch (error) {
        console.error('AI command error:', error);
        res.status(500).json({ action: 'info', message: 'AI xizmatida xatolik yuz berdi.' });
    }
});

export default router;
