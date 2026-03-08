from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import InventoryCheck, InventoryItem, Product, User
from schemas import InventoryCheckCreate, InventoryCheckOut, InventoryItemOut
from auth import get_current_user

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])


def _check_to_out(check: InventoryCheck) -> InventoryCheckOut:
    out = InventoryCheckOut.model_validate(check)
    out.created_by_name = check.created_by_user.full_name if check.created_by_user else None
    items_out = []
    for item in check.items:
        io = InventoryItemOut.model_validate(item)
        io.product_name = item.product.name if item.product else None
        io.product_sku = item.product.sku if item.product else None
        items_out.append(io)
    out.items = items_out
    return out


@router.get("/", response_model=list[InventoryCheckOut])
def list_checks(db: Session = Depends(get_db)):
    checks = db.query(InventoryCheck).order_by(InventoryCheck.created_at.desc()).limit(20).all()
    return [_check_to_out(c) for c in checks]


@router.get("/{check_id}", response_model=InventoryCheckOut)
def get_check(check_id: int, db: Session = Depends(get_db)):
    check = db.query(InventoryCheck).filter(InventoryCheck.id == check_id).first()
    if not check:
        raise HTTPException(status_code=404, detail="Inventarizatsiya topilmadi")
    return _check_to_out(check)


@router.post("/", response_model=InventoryCheckOut, status_code=201)
def create_check(
    data: InventoryCheckCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check = InventoryCheck(created_by=current_user.id, status="in_progress")
    db.add(check)
    db.flush()

    for item_data in data.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            continue
        diff = item_data.actual_quantity - product.current_stock
        inv_item = InventoryItem(
            check_id=check.id,
            product_id=item_data.product_id,
            system_quantity=product.current_stock,
            actual_quantity=item_data.actual_quantity,
            difference=diff,
            notes=item_data.notes,
        )
        db.add(inv_item)

    db.commit()
    db.refresh(check)
    return _check_to_out(check)


@router.post("/{check_id}/complete", response_model=InventoryCheckOut)
def complete_check(check_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    check = db.query(InventoryCheck).filter(InventoryCheck.id == check_id).first()
    if not check:
        raise HTTPException(status_code=404, detail="Inventarizatsiya topilmadi")
    if check.status == "completed":
        raise HTTPException(status_code=400, detail="Allaqachon yakunlangan")

    # Apply actual quantities to products
    for item in check.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.current_stock = item.actual_quantity

    check.status = "completed"
    check.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(check)
    return _check_to_out(check)
