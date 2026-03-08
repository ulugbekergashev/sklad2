from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Auth ──────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "warehouse_staff"


class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Category ─────────────────────────────────────────
class CategoryCreate(BaseModel):
    name: str
    description: str = ""
    color: str = "#6366f1"


class CategoryOut(BaseModel):
    id: int
    name: str
    description: str
    color: str
    product_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ── Supplier ─────────────────────────────────────────
class SupplierCreate(BaseModel):
    name: str
    contact_person: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""


class SupplierOut(BaseModel):
    id: int
    name: str
    contact_person: str
    phone: str
    email: str
    address: str

    class Config:
        from_attributes = True


# ── Product ──────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str
    sku: str
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    unit: str = "dona"
    price: float = 0.0
    min_stock: int = 0
    location: str = ""
    image_url: str = ""


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    min_stock: Optional[int] = None
    location: Optional[str] = None
    image_url: Optional[str] = None


class ProductOut(BaseModel):
    id: int
    name: str
    sku: str
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    unit: str
    price: float
    min_stock: int
    current_stock: int
    location: str
    image_url: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Stock Movement ───────────────────────────────────
class MovementCreate(BaseModel):
    product_id: int
    movement_type: str  # IN or OUT
    quantity: int
    unit_price: float = 0.0
    supplier_id: Optional[int] = None
    reference_number: str = ""
    notes: str = ""
    # Qarzdorlik uchun
    paid_amount: Optional[float] = None  # None = to'liq to'langan
    counterparty_name: str = ""  # Qarzdor ismi (agar to'liq to'lanmasa)
    counterparty_phone: str = ""  # Qarzdor telefoni


class MovementOut(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    movement_type: str
    quantity: int
    unit_price: float
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    reference_number: str
    notes: str
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Inventory ────────────────────────────────────────
class InventoryItemCreate(BaseModel):
    product_id: int
    actual_quantity: int
    notes: str = ""


class InventoryItemOut(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    system_quantity: int
    actual_quantity: int
    difference: int
    notes: str

    class Config:
        from_attributes = True


class InventoryCheckCreate(BaseModel):
    items: list[InventoryItemCreate] = []


class InventoryCheckOut(BaseModel):
    id: int
    status: str
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    items: list[InventoryItemOut] = []

    class Config:
        from_attributes = True


# ── Dashboard ────────────────────────────────────────
class DashboardStats(BaseModel):
    total_products: int
    total_value: float
    today_in: int
    today_out: int
    low_stock_count: int
    categories_count: int


class DashboardTrend(BaseModel):
    date: str
    incoming: int
    outgoing: int

# ── Debts ────────────────────────────────────────
class DebtCreate(BaseModel):
    debt_type: str  # receivable or payable
    counterparty_name: str
    counterparty_phone: str = ""
    total_amount: float
    description: str = ""
    due_date: Optional[datetime] = None
    movement_id: Optional[int] = None


class DebtPaymentCreate(BaseModel):
    amount: float
    payment_method: str = "naqd"
    notes: str = ""


class DebtPaymentOut(BaseModel):
    id: int
    debt_id: int
    amount: float
    payment_method: str
    notes: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DebtOut(BaseModel):
    id: int
    debt_type: str
    counterparty_name: str
    counterparty_phone: str
    total_amount: float
    paid_amount: float
    remaining_amount: float
    description: str
    due_date: Optional[datetime] = None
    status: str
    movement_id: Optional[int] = None
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    payments: list[DebtPaymentOut] = []

    class Config:
        from_attributes = True


class DebtStats(BaseModel):
    total_receivable: float
    total_payable: float
    overdue_receivable: float
    overdue_payable: float
    receivable_count: int
    payable_count: int
    overdue_count: int


# Rebuild forward refs
TokenResponse.model_rebuild()
