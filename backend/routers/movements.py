from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import StockMovement, Product, User, Debt
from schemas import MovementCreate, MovementOut
from auth import get_current_user

router = APIRouter(prefix="/api/movements", tags=["Stock Movements"])


def _to_out(m: StockMovement) -> MovementOut:
    out = MovementOut.model_validate(m)
    out.product_name = m.product.name if m.product else None
    out.product_sku = m.product.sku if m.product else None
    out.supplier_name = m.supplier.name if m.supplier else None
    out.created_by_name = m.created_by_user.full_name if m.created_by_user else None
    return out


@router.get("/", response_model=list[MovementOut])
def list_movements(
    movement_type: str = Query("", description="IN yoki OUT"),
    product_id: int = Query(0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(StockMovement)
    if movement_type:
        q = q.filter(StockMovement.movement_type == movement_type.upper())
    if product_id:
        q = q.filter(StockMovement.product_id == product_id)
    movements = q.order_by(StockMovement.created_at.desc()).limit(limit).all()
    return [_to_out(m) for m in movements]


@router.post("/", response_model=MovementOut, status_code=201)
def create_movement(
    data: MovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")

    if data.movement_type.upper() not in ("IN", "OUT"):
        raise HTTPException(status_code=400, detail="movement_type IN yoki OUT bo'lishi kerak")

    if data.movement_type.upper() == "OUT":
        if product.current_stock < data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Zaxira yetarli emas. Mavjud: {product.current_stock}, So'ralgan: {data.quantity}",
            )
        product.current_stock -= data.quantity
    else:
        product.current_stock += data.quantity

    movement = StockMovement(
        product_id=data.product_id,
        movement_type=data.movement_type.upper(),
        quantity=data.quantity,
        unit_price=data.unit_price,
        supplier_id=data.supplier_id,
        reference_number=data.reference_number,
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(movement)
    db.flush()  # Get movement.id before commit

    # Agar to'liq to'lanmagan bo'lsa — qarz yaratish
    total_amount = data.quantity * data.unit_price
    if data.paid_amount is not None and total_amount > 0 and data.paid_amount < total_amount:
        remaining = total_amount - data.paid_amount
        # OUT = mijoz bizga qarzdor, IN = biz yetkazuvchiga qarzdormiz
        debt_type = "receivable" if data.movement_type.upper() == "OUT" else "payable"
        counterparty = data.counterparty_name or (
            product.name + " - mijoz" if debt_type == "receivable"
            else (movement.supplier.name if data.supplier_id and movement.supplier else product.name + " - yetkazuvchi")
        )
        debt = Debt(
            debt_type=debt_type,
            counterparty_name=counterparty,
            counterparty_phone=data.counterparty_phone,
            total_amount=total_amount,
            paid_amount=data.paid_amount,
            remaining_amount=remaining,
            description=f"{product.name} x{data.quantity} — {data.movement_type.upper()}",
            movement_id=movement.id,
            created_by=current_user.id,
        )
        db.add(debt)

    db.commit()
    db.refresh(movement)
    db.refresh(product)
    return _to_out(movement)

