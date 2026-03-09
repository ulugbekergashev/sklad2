import { Sequelize } from 'sequelize';
import pg from 'pg'; // Explicitly imported for Vercel Serverless
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectModule: pg, // Required for Vercel 
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        },
        prepared_statements: false,
    },
    logging: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
});

export default sequelize;
