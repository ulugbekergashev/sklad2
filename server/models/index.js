import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    full_name: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'warehouse_staff'), defaultValue: 'warehouse_staff' },
    phone: { type: DataTypes.STRING },
    telegram_chat_id: { type: DataTypes.STRING },
}, { tableName: 'users', timestamps: true });

export const Category = sequelize.define('Category', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT },
    color: { type: DataTypes.STRING(7), defaultValue: '#6366f1' },
}, { tableName: 'categories', timestamps: true });

export const Product = sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    sku: { type: DataTypes.STRING, allowNull: false, unique: true },
    barcode: { type: DataTypes.STRING },
    unit: { type: DataTypes.STRING, defaultValue: 'dona' },
    price: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    min_stock: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    current_stock: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    location: { type: DataTypes.STRING },
    image_url: { type: DataTypes.TEXT },
    category_id: { type: DataTypes.INTEGER, references: { model: 'categories', key: 'id' } },
}, { tableName: 'products', timestamps: true });

export const Supplier = sequelize.define('Supplier', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    contact_person: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    address: { type: DataTypes.TEXT },
}, { tableName: 'suppliers', timestamps: true });

export const StockMovement = sequelize.define('StockMovement', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'products', key: 'id' } },
    movement_type: { type: DataTypes.ENUM('IN', 'OUT'), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    total_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    paid_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    reference_number: { type: DataTypes.STRING },
    notes: { type: DataTypes.TEXT },
    created_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
    supplier_id: { type: DataTypes.INTEGER, references: { model: 'suppliers', key: 'id' } },
    counterparty_name: { type: DataTypes.STRING },
}, { tableName: 'stock_movements', timestamps: true });

export const Debt = sequelize.define('Debt', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    movement_id: { type: DataTypes.INTEGER, references: { model: 'stock_movements', key: 'id' } },
    debt_type: { type: DataTypes.ENUM('receivable', 'payable'), allowNull: false },
    counterparty_name: { type: DataTypes.STRING, allowNull: false },
    counterparty_phone: { type: DataTypes.STRING },
    total_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    paid_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    remaining_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    status: { type: DataTypes.ENUM('active', 'paid', 'overdue'), defaultValue: 'active' },
    due_date: { type: DataTypes.DATE },
    description: { type: DataTypes.TEXT },
    created_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
}, { tableName: 'debts', timestamps: true });

export const DebtPayment = sequelize.define('DebtPayment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    debt_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'debts', key: 'id' } },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    payment_method: { type: DataTypes.ENUM('naqd', 'karta', 'bank'), defaultValue: 'naqd' },
    notes: { type: DataTypes.TEXT },
}, { tableName: 'debt_payments', timestamps: true });

export const InventoryCheck = sequelize.define('InventoryCheck', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    status: { type: DataTypes.ENUM('in_progress', 'completed'), defaultValue: 'in_progress' },
    completed_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
}, { tableName: 'inventory_checks', timestamps: true });

export const InventoryItem = sequelize.define('InventoryItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    check_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'inventory_checks', key: 'id' } },
    product_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'products', key: 'id' } },
    system_quantity: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    actual_quantity: { type: DataTypes.DECIMAL(15, 2) },
    difference: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    notes: { type: DataTypes.TEXT },
}, { tableName: 'inventory_items', timestamps: true });

export const Request = sequelize.define('Request', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    client_name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING },
    product_id: { type: DataTypes.INTEGER, references: { model: 'products', key: 'id' } },
    product_name: { type: DataTypes.STRING }, // erkin kiritish uchun
    quantity: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    expected_date: { type: DataTypes.DATE },
    status: { type: DataTypes.ENUM('pending', 'completed', 'cancelled'), defaultValue: 'pending' },
    notes: { type: DataTypes.TEXT },
    created_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
}, { tableName: 'requests', timestamps: true });

// ========== RELATIONSHIPS ==========

// Product <-> Category
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// StockMovement <-> Product
Product.hasMany(StockMovement, { foreignKey: 'product_id', as: 'movements' });
StockMovement.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// StockMovement <-> User
User.hasMany(StockMovement, { foreignKey: 'created_by', as: 'movements' });
StockMovement.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// StockMovement <-> Supplier
Supplier.hasMany(StockMovement, { foreignKey: 'supplier_id', as: 'movements' });
StockMovement.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

// Debt <-> StockMovement
StockMovement.hasOne(Debt, { foreignKey: 'movement_id', as: 'debt' });
Debt.belongsTo(StockMovement, { foreignKey: 'movement_id', as: 'movement' });

// Debt <-> User
User.hasMany(Debt, { foreignKey: 'created_by', as: 'debts' });
Debt.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// DebtPayment <-> Debt
Debt.hasMany(DebtPayment, { foreignKey: 'debt_id', as: 'payments' });
DebtPayment.belongsTo(Debt, { foreignKey: 'debt_id', as: 'debt' });

// InventoryCheck <-> User
User.hasMany(InventoryCheck, { foreignKey: 'created_by', as: 'inventoryChecks' });
InventoryCheck.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// InventoryItem <-> InventoryCheck
InventoryCheck.hasMany(InventoryItem, { foreignKey: 'check_id', as: 'items' });
InventoryItem.belongsTo(InventoryCheck, { foreignKey: 'check_id', as: 'check' });

// InventoryItem <-> Product
Product.hasMany(InventoryItem, { foreignKey: 'product_id', as: 'inventoryItems' });
InventoryItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Request <-> User
User.hasMany(Request, { foreignKey: 'created_by', as: 'requests' });
Request.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Request <-> Product
Product.hasMany(Request, { foreignKey: 'product_id', as: 'requests' });
Request.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

export default sequelize;
