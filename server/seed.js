import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import sequelize from './config/database.js';
import { User, Category } from './models/index.js';

dotenv.config();

const seed = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database ulanishi muvaffaqiyatli');

        await sequelize.sync({ force: true });
        console.log('✅ Jadvallar sinxronlashtirildi');

        // Create admin user
        const existingAdmin = await User.findOne({ where: { username: 'admin' } });
        if (!existingAdmin) {
            const hash = await bcrypt.hash('admin123', 10);
            await User.create({
                username: 'admin',
                password_hash: hash,
                full_name: 'Administrator',
                role: 'admin',
            });
            console.log('✅ Admin foydalanuvchi yaratildi (admin / admin123)');
        } else {
            console.log('ℹ️  Admin foydalanuvchi allaqachon mavjud');
        }

        // Create sample categories
        const categories = [
            { name: 'Oziq-ovqat', description: 'Oziq-ovqat mahsulotlari', color: '#22c55e' },
            { name: 'Ichimliklar', description: 'Ichimlik turlari', color: '#3b82f6' },
            { name: 'Maishiy texnika', description: 'Uy-ro\'zg\'or jihozlari', color: '#f59e0b' },
            { name: 'Qurilish mollari', description: 'Qurilish materiallari', color: '#ef4444' },
            { name: 'Kiyim-kechak', description: 'Kiyim va poyafzallar', color: '#8b5cf6' },
        ];

        for (const cat of categories) {
            const exists = await Category.findOne({ where: { name: cat.name } });
            if (!exists) {
                await Category.create(cat);
                console.log(`✅ Kategoriya yaratildi: ${cat.name}`);
            }
        }

        console.log('\n🎉 Seed muvaffaqiyatli yakunlandi!');
        console.log('   Login: admin / admin123');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed xatolik:', error);
        process.exit(1);
    }
};

seed();
