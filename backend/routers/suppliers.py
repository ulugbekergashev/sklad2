from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Supplier
from schemas import SupplierCreate, SupplierOut
from auth import get_current_user

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])


@router.get("/", response_model=list[SupplierOut])
def list_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).order_by(Supplier.name).all()


@router.post("/", response_model=SupplierOut, status_code=201)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    sup = Supplier(**data.model_dump())
    db.add(sup)
    db.commit()
    db.refresh(sup)
    return sup


@router.put("/{sup_id}", response_model=SupplierOut)
def update_supplier(sup_id: int, data: SupplierCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    sup = db.query(Supplier).filter(Supplier.id == sup_id).first()
    if not sup:
        raise HTTPException(status_code=404, detail="Yetkazib beruvchi topilmadi")
    for k, v in data.model_dump().items():
        setattr(sup, k, v)
    db.commit()
    db.refresh(sup)
    return sup


@router.delete("/{sup_id}")
def delete_supplier(sup_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    sup = db.query(Supplier).filter(Supplier.id == sup_id).first()
    if not sup:
        raise HTTPException(status_code=404, detail="Yetkazib beruvchi topilmadi")
    db.delete(sup)
    db.commit()
    return {"detail": "O'chirildi"}
