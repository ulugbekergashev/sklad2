import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import sequelize from '../config/database.js';
import { User, Product, Debt } from '../models/index.js';
import { executeAction, buildConfirmationMessage } from './actions.js';

dotenv.config();

// Pending confirmations per chat ID
const pendingActions = new Map();

/**
 * AI ga xabar yuborib javob olish
 */
async function askAI(message) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return { action: 'info', message: 'AI sozlanmagan. OPENROUTER_API_KEY kerak.' };
    }

    // Kontekstni yig'ish
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

    const systemPrompt = `Sen SKLAD WMS ombor boshqaruv tizimining Telegram AI assistentisan. Foydalanuvchi o'zbek tilida yozadi yoki ovozli xabar yuboradi.

Hozirgi ombor holati:
MAHSULOTLAR:
${productContext || 'Hozircha mahsulot yo\'q'}

AKTIV QARZLAR:
${debtContext || 'Aktiv qarz yo\'q'}

SEN FAQAT JSON FORMATDA JAVOB BERISHING KERAK:
{
  "action": "info" | "incoming" | "outgoing" | "payment" | "add_product",
  "message": "Foydalanuvchiga xabar (o'zbek tilida)",
  ...qo'shimcha maydonlar
}

ACTION TURLARI:
1. "info" — oddiy ma'lumot berish: {"action": "info", "message": "javob"}
2. "incoming" — kirim: {"action": "incoming", "product_name": "nomi", "quantity": 10, "unit_price": 5000, "paid_amount": 50000, "counterparty_name": "yetkazib beruvchi", "message": "..."}
3. "outgoing" — chiqim: {"action": "outgoing", "product_name": "nomi", "quantity": 5, "unit_price": 10000, "paid_amount": 0, "counterparty_name": "mijoz", "message": "..."}
4. "payment" — qarz to'lash: {"action": "payment", "counterparty_name": "ism", "amount": 50000, "message": "..."}
5. "add_product" — yangi mahsulot: {"action": "add_product", "name": "nomi", "sku": "SKU001", "unit": "dona", "price": 5000, "initial_stock": 100, "message": "..."}

MUHIM: Har doim JSON formatda javob ber. O'zbek tilida javob yoz.`;

    try {
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
        try {
            const content = data.choices?.[0]?.message?.content || '{}';
            return JSON.parse(content);
        } catch {
            return { action: 'info', message: data.choices?.[0]?.message?.content || 'Javob olishda xatolik' };
        }
    } catch (err) {
        console.error('AI error:', err);
        return { action: 'info', message: 'AI xizmatida xatolik yuz berdi.' };
    }
}

/**
 * Ovozli xabarni matnga aylantirish (Groq Whisper yoki OpenRouter)
 */
async function transcribeVoice(fileBuffer) {
    // Groq Whisper API (bepul, tez)
    const groqKey = process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;

    // Try Groq first (better for speech-to-text)
    if (process.env.GROQ_API_KEY) {
        try {
            const formData = new FormData();
            formData.append('file', new Blob([fileBuffer], { type: 'audio/ogg' }), 'voice.ogg');
            formData.append('model', 'whisper-large-v3');
            formData.append('language', 'uz');

            const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
                body: formData,
            });

            const data = await response.json();
            return data.text || '';
        } catch (err) {
            console.error('Groq Whisper error:', err);
        }
    }

    // Fallback: OpenRouter Gemini with audio (multimodal)
    try {
        const base64Audio = fileBuffer.toString('base64');
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) return '';

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://sklad-wms.app',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'input_audio',
                            input_audio: { data: base64Audio, format: 'ogg' },
                        },
                        {
                            type: 'text',
                            text: 'Bu ovozli xabarni aniq matn shaklida yoz. Faqat aytilgan so\'zlarni yoz, hech narsa qo\'shma. O\'zbek tilida.',
                        },
                    ],
                }],
                temperature: 0.1,
            }),
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
    } catch (err) {
        console.error('Transcribe error:', err);
        return '';
    }
}

/**
 * Telegram botni ishga tushirish
 */
export function startBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.log('⚠️  TELEGRAM_BOT_TOKEN topilmadi, bot ishga tushmaydi');
        return null;
    }

    const bot = new TelegramBot(token, { polling: true });
    console.log('🤖 Telegram bot ishga tushdi');

    // /start buyrug'i
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;

        // Allaqachon ro'yxatdan o'tganmi?
        const existingUser = await User.findOne({ where: { telegram_chat_id: String(chatId) } });
        if (existingUser) {
            bot.sendMessage(chatId,
                `✅ Salom, *${existingUser.full_name}*! Siz allaqachon tizimga ulanganiz.\n\n` +
                `📝 Matn yoki 🎤 ovozli xabar yuboring — men ombor buyruqlarini bajaraman.\n\n` +
                `Masalan: _"10 ta olma kirim qil"_ yoki _"Dilshodga 5 ta olma sotdim"_`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Kontakt so'rash
        bot.sendMessage(chatId,
            `🏗️ *SKLAD WMS* — Ombor boshqaruv tizimi\n\n` +
            `Tizimga ulanish uchun telefon raqamingizni ulashing.\n` +
            `Saytda profilingizda ko'rsatilgan raqam bilan bir xil bo'lishi kerak.`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [[{
                        text: '📱 Telefon raqamimni ulashish',
                        request_contact: true,
                    }]],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            }
        );
    });

    // Kontakt qabul qilish (telefon raqami)
    bot.on('contact', async (msg) => {
        const chatId = msg.chat.id;
        const contact = msg.contact;

        if (!contact?.phone_number) {
            bot.sendMessage(chatId, '❌ Telefon raqami topilmadi.');
            return;
        }

        // Raqamni normalize qilish (+998... -> 998...)
        let phone = contact.phone_number.replace(/\D/g, '');
        if (phone.startsWith('998')) phone = '+' + phone;
        else if (!phone.startsWith('+')) phone = '+' + phone;

        // Bazadan raqam bo'yicha foydalanuvchini topish
        const user = await User.findOne({
            where: sequelize.where(
                sequelize.fn('REPLACE', sequelize.fn('REPLACE', sequelize.col('phone'), '+', ''), ' ', ''),
                phone.replace(/[+ ]/g, '')
            ),
        });

        if (!user) {
            bot.sendMessage(chatId,
                `❌ Bu raqam (${phone}) tizimda topilmadi.\n\n` +
                `Saytdan profilingizga shu raqamni kiriting, keyin qaytadan /start ni bosing.`,
                { reply_markup: { remove_keyboard: true } }
            );
            return;
        }

        // telegram_chat_id ni saqlash
        await user.update({ telegram_chat_id: String(chatId) });

        bot.sendMessage(chatId,
            `✅ *Muvaffaqiyatli!*\n\n` +
            `Salom, *${user.full_name}*! (${user.role === 'admin' ? '🛡️ Admin' : '📦 Xodim'})\n\n` +
            `Endi menga 📝 matn yoki 🎤 ovozli xabar yuboring:\n` +
            `• _"10 ta olma kirim qil, narxi 5000"_\n` +
            `• _"Dilshodga 3 ta guruch sotdim, pulini bermadi"_\n` +
            `• _"Alining qarzidan 50000 to'landi"_\n` +
            `• _"Omborda nima bor?"_`,
            { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
        );
    });

    // Matn xabarlarini qayta ishlash
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;

        // /start va kontaktlarni o'tkazib yuborish
        if (msg.text?.startsWith('/') || msg.contact) return;
        // Ovozli xabarlarni alohida qayta ishlaymiz
        if (msg.voice) return;

        if (!msg.text) return;

        // Foydalanuvchini tekshirish
        const user = await User.findOne({ where: { telegram_chat_id: String(chatId) } });
        if (!user) {
            bot.sendMessage(chatId, '⚠️ Avval /start buyrug\'ini yuboring va tizimga ulaning.');
            return;
        }

        await bot.sendChatAction(chatId, 'typing');

        // AI ga yuborish
        const aiResponse = await askAI(msg.text);

        // Agar info bo'lsa, to'g'ridan-to'g'ri javob berish
        if (aiResponse.action === 'info') {
            bot.sendMessage(chatId, aiResponse.message || 'Ma\'lumot yo\'q.', { parse_mode: 'Markdown' });
            return;
        }

        // Tasdiqlash xabarini ko'rsatish
        const confirmMsg = buildConfirmationMessage(aiResponse);
        if (confirmMsg) {
            pendingActions.set(chatId, { aiResponse, originalMessage: msg.text, userId: user.id });

            bot.sendMessage(chatId, confirmMsg, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '✅ Ha, bajaring', callback_data: 'confirm_yes' },
                        { text: '❌ Yo\'q, bekor', callback_data: 'confirm_no' },
                    ]],
                },
            });
        } else {
            bot.sendMessage(chatId, aiResponse.message || 'Tushunmadim.', { parse_mode: 'Markdown' });
        }
    });

    // Ovozli xabarlarni qayta ishlash
    bot.on('voice', async (msg) => {
        const chatId = msg.chat.id;

        const user = await User.findOne({ where: { telegram_chat_id: String(chatId) } });
        if (!user) {
            bot.sendMessage(chatId, '⚠️ Avval /start buyrug\'ini yuboring va tizimga ulaning.');
            return;
        }

        await bot.sendMessage(chatId, '🎤 Ovozli xabar qayta ishlanmoqda...');
        await bot.sendChatAction(chatId, 'typing');

        try {
            // Faylni yuklab olish
            const fileId = msg.voice.file_id;
            const fileLink = await bot.getFileLink(fileId);
            const response = await fetch(fileLink);
            const fileBuffer = Buffer.from(await response.arrayBuffer());

            // Ovozni matnga aylantirish
            const transcript = await transcribeVoice(fileBuffer);

            if (!transcript) {
                bot.sendMessage(chatId, '❌ Ovozli xabarni tanib bo\'lmadi. Iltimos, qayta urinib ko\'ring yoki matn yozing.');
                return;
            }

            bot.sendMessage(chatId, `📝 Tushundim: _"${transcript}"_`, { parse_mode: 'Markdown' });
            await bot.sendChatAction(chatId, 'typing');

            // AI ga yuborish
            const aiResponse = await askAI(transcript);

            if (aiResponse.action === 'info') {
                bot.sendMessage(chatId, aiResponse.message || 'Ma\'lumot yo\'q.', { parse_mode: 'Markdown' });
                return;
            }

            // Tasdiqlash
            const confirmMsg = buildConfirmationMessage(aiResponse);
            if (confirmMsg) {
                pendingActions.set(chatId, { aiResponse, originalMessage: transcript, userId: user.id });

                bot.sendMessage(chatId, confirmMsg, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '✅ Ha, bajaring', callback_data: 'confirm_yes' },
                            { text: '❌ Yo\'q, bekor', callback_data: 'confirm_no' },
                        ]],
                    },
                });
            } else {
                bot.sendMessage(chatId, aiResponse.message || 'Tushunmadim.', { parse_mode: 'Markdown' });
            }
        } catch (err) {
            console.error('Voice processing error:', err);
            bot.sendMessage(chatId, '❌ Ovozli xabarni qayta ishlashda xatolik.');
        }
    });

    // Tasdiqlash callback'lari
    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const action = callbackQuery.data;

        const pending = pendingActions.get(chatId);
        if (!pending) {
            await bot.answerCallbackQuery(callbackQuery.id, { text: 'Bu amal allaqachon eskirgan.' });
            return;
        }

        if (action === 'confirm_yes') {
            await bot.answerCallbackQuery(callbackQuery.id, { text: '⏳ Bajarilmoqda...' });
            await bot.editMessageReplyMarkup({}, {
                chat_id: chatId,
                message_id: callbackQuery.message.message_id,
            }).catch(() => { });

            // Operatsiyani bajarish
            const result = await executeAction(pending.aiResponse, pending.originalMessage, pending.userId);
            pendingActions.delete(chatId);

            if (result.executed) {
                let successMsg = '✅ *Muvaffaqiyatli bajarildi!*\n\n';
                successMsg += result.message || '';

                if (result.action === 'incoming') {
                    successMsg += `\n\n📦 ${result.productName}: yangi qoldiq *${result.newStock}* ${result.unit}`;
                    if (result.debtCreated) successMsg += `\n⚠️ Qarz: *${new Intl.NumberFormat('uz-UZ').format(result.debtCreated)}* so'm`;
                } else if (result.action === 'outgoing') {
                    successMsg += `\n\n📦 ${result.productName}: yangi qoldiq *${result.newStock}* ${result.unit}`;
                    if (result.debtCreated) successMsg += `\n💰 Qarz (bizga): *${new Intl.NumberFormat('uz-UZ').format(result.debtCreated)}* so'm`;
                } else if (result.action === 'payment') {
                    successMsg += `\n\n👤 ${result.counterparty}: To'landi *${new Intl.NumberFormat('uz-UZ').format(result.debtPaid)}* so'm`;
                    successMsg += `\nQoldiq qarz: *${new Intl.NumberFormat('uz-UZ').format(result.debtRemaining)}* so'm`;
                } else if (result.action === 'add_product') {
                    successMsg += `\n\n📦 *${result.productName}* (${result.productSku}) qo'shildi`;
                }

                bot.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(chatId, `❌ ${result.message || 'Xatolik yuz berdi.'}`, { parse_mode: 'Markdown' });
            }

        } else if (action === 'confirm_no') {
            pendingActions.delete(chatId);
            await bot.answerCallbackQuery(callbackQuery.id, { text: 'Bekor qilindi' });
            await bot.editMessageReplyMarkup({}, {
                chat_id: chatId,
                message_id: callbackQuery.message.message_id,
            }).catch(() => { });
            bot.sendMessage(chatId, '🚫 Amal bekor qilindi.');
        }
    });

    // /status buyrug'i — ombor holati
    bot.onText(/\/status/, async (msg) => {
        const chatId = msg.chat.id;
        const user = await User.findOne({ where: { telegram_chat_id: String(chatId) } });
        if (!user) return;

        const products = await Product.findAll({ raw: true });
        const activeDebts = await Debt.findAll({ where: { status: 'active' }, raw: true });

        const totalProducts = products.length;
        const totalValue = products.reduce((s, p) => s + parseFloat(p.current_stock) * parseFloat(p.price), 0);
        const lowStock = products.filter(p => parseFloat(p.current_stock) <= parseFloat(p.min_stock)).length;
        const totalDebt = activeDebts.reduce((s, d) => s + parseFloat(d.remaining_amount), 0);

        const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(n);

        let statusMsg = `📊 *SKLAD holati*\n\n`;
        statusMsg += `📦 Jami mahsulotlar: *${totalProducts}*\n`;
        statusMsg += `💰 Ombor qiymati: *${fmt(totalValue)}* so'm\n`;
        statusMsg += `⚠️ Kam qolgan: *${lowStock}*\n`;
        statusMsg += `💳 Aktiv qarzlar: *${fmt(totalDebt)}* so'm\n`;

        if (lowStock > 0) {
            statusMsg += `\n🔴 *Kam qolgan mahsulotlar:*\n`;
            products
                .filter(p => parseFloat(p.current_stock) <= parseFloat(p.min_stock))
                .slice(0, 10)
                .forEach(p => {
                    statusMsg += `• ${p.name}: *${p.current_stock}* ${p.unit}\n`;
                });
        }

        bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
    });

    // /help buyrug'i
    bot.onText(/\/help/, async (msg) => {
        bot.sendMessage(msg.chat.id,
            `📖 *SKLAD WMS Bot — Yordam*\n\n` +
            `*Buyruqlar:*\n` +
            `/start — Tizimga ulanish\n` +
            `/status — Ombor holati\n` +
            `/help — Yordam\n\n` +
            `*Ovozli yoki matn buyruqlari:*\n` +
            `• _"10 ta olma kirim qil, Alidansotib oldim, 50 mingdan"_\n` +
            `• _"Dilshodga 5 ta guruch sotdim, pulini bermadi"_\n` +
            `• _"Alining qarzidan 100 ming to'landi"_\n` +
            `• _"Yangi mahsulot: Sabzi, narxi 3000, 50 kg"_\n` +
            `• _"Omborda nima bor?"_\n` +
            `• _"Kimda qarz bor?"_`,
            { parse_mode: 'Markdown' }
        );
    });

    return bot;
}
