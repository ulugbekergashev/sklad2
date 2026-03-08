from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, func
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), default="warehouse_staff")  # admin, manager, warehouse_staff
    created_at = Column(DateTime, server_default=func.now())

    movements = relationship("StockMovement", back_populates="created_by_user")
    inventory_checks = relationship("InventoryCheck", back_populates="created_by_user")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, default="")
    color = Column(String(7), default="#6366f1")

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    barcode = Column(String(50), unique=True, index=True, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    unit = Column(String(20), default="dona")  # dona, kg, litr, metr, etc.
    price = Column(Float, default=0.0)
    min_stock = Column(Integer, default=0)
    current_stock = Column(Integer, default=0)
    location = Column(String(100), default="")  # e.g. "A-1-3" (row-shelf-level)
    image_url = Column(String(500), default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    category = relationship("Category", back_populates="products")
    movements = relationship("StockMovement", back_populates="product")
    inventory_items = relationship("InventoryItem", back_populates="product")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    contact_person = Column(String(100), default="")
    phone = Column(String(20), default="")
    email = Column(String(100), default="")
    address = Column(Text, default="")

    movements = relationship("StockMovement", back_populates="supplier")


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    movement_type = Column(String(10), nullable=False)  # IN or OUT
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, default=0.0)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    reference_number = Column(String(50), default="")
    notes = Column(Text, default="")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    product = relationship("Product", back_populates="movements")
    supplier = relationship("Supplier", back_populates="movements")
    created_by_user = relationship("User", back_populates="movements")


class InventoryCheck(Base):
    __tablename__ = "inventory_checks"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String(20), default="in_progress")  # in_progress, completed
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)

    created_by_user = relationship("User", back_populates="inventory_checks")
    items = relationship("InventoryItem", back_populates="check", cascade="all, delete-orphan")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    check_id = Column(Integer, ForeignKey("inventory_checks.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    system_quantity = Column(Integer, default=0)
    actual_quantity = Column(Integer, default=0)
    difference = Column(Integer, default=0)
    notes = Column(Text, default="")

    check = relationship("InventoryCheck", back_populates="items")
    product = relationship("Product", back_populates="inventory_items")


class Debt(Base):
    __tablename__ = "debts"

    id = Column(Integer, primary_key=True, index=True)
    debt_type = Column(String(10), nullable=False)  # receivable (mijoz qarzi) / payable (bizning qarzimiz)
    counterparty_name = Column(String(200), nullable=False)  # mijoz yoki yetkazuvchi nomi
    counterparty_phone = Column(String(20), default="")
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    remaining_amount = Column(Float, default=0.0)
    description = Column(Text, default="")
    due_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="active")  # active, paid, overdue
    movement_id = Column(Integer, ForeignKey("stock_movements.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    movement = relationship("StockMovement")
    created_by_user = relationship("User")
    payments = relationship("DebtPayment", back_populates="debt", cascade="all, delete-orphan")


class DebtPayment(Base):
    __tablename__ = "debt_payments"

    id = Column(Integer, primary_key=True, index=True)
    debt_id = Column(Integer, ForeignKey("debts.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), default="naqd")  # naqd, karta, bank
    notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())

    debt = relationship("Debt", back_populates="payments")
