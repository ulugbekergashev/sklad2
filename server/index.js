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
import authMiddleware from './middleware/auth.js';
import { startBot } from './telegram/bot.js';

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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
const start = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database ulanishi muvaffaqiyatli');

        await sequelize.sync({ alter: true });
        console.log('✅ Database jadvallari sinxronlashtirildi');

        app.listen(PORT, () => {
            console.log(`🚀 Server ${PORT}-portda ishga tushdi`);
            console.log(`   http://localhost:${PORT}`);
        });

        // Telegram bot
        startBot();
    } catch (error) {
        console.error('❌ Server ishga tushirishda xatolik:', error);
        process.exit(1);
    }
};

start();
