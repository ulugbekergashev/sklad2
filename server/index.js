import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import sequelize from './config/database.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import supplierRoutes from './routes/suppliers.js';
import movementRoutes from './routes/movements.js';
import debtRoutes from './routes/debts.js';
import inventoryRoutes from './routes/inventory.js';
import reportRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import aiRoutes from './routes/ai.js';
import userRoutes from './routes/users.js';
import requestRoutes from './routes/requests.js';
import authMiddleware from './middleware/auth.js';
import { initBot, getBot } from './telegram/bot.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (auth middleware)
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/suppliers', authMiddleware, supplierRoutes);
app.use('/api/movements', authMiddleware, movementRoutes);
app.use('/api/debts', authMiddleware, debtRoutes);
app.use('/api/inventory', authMiddleware, inventoryRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/requests', authMiddleware, requestRoutes);

// Telegram Webhook endpoint (for Vercel)
app.post('/api/telegram-webhook', async (req, res) => {
    const bot = getBot();
    if (bot) {
        bot.processUpdate(req.body);

        await new Promise(resolve => setTimeout(resolve, 10));

        let activePromises = Array.from(bot.activePromises || []);
        while (activePromises.length > 0) {
            await Promise.allSettled(activePromises);
            activePromises = Array.from(bot.activePromises || []);
        }
    }
    res.sendStatus(200);
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database and Server Init
const initServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database ulanishi muvaffaqiyatli');

        // Vercel serverless muhitida alter: true qilmaymiz, ortiqcha yuk.
        if (!process.env.VERCEL) {
            await sequelize.sync({ alter: true });
            console.log('✅ Database jadvallari sinxronlashtirildi');
        }
    } catch (error) {
        console.error('❌ DB Xatoligi:', error);
    }
};

if (process.env.VERCEL) {
    // Vercel (Serverless) muhitida app.listen chaqirilmaydi
    initServer();
    initBot(app);
} else {
    // Local (Polling) muhitida
    const start = async () => {
        await initServer();
        app.listen(PORT, () => {
            console.log(`🚀 Server ${PORT}-portda ishga tushdi`);
            console.log(`   http://localhost:${PORT}`);
        });
        initBot(app);
    };
    start();
}

// Vercel uchun xizmat qiladi
export default app;
