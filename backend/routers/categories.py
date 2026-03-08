from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from database import get_db
from models import Category, Product
from schemas import CategoryCreate, CategoryOut
from auth import get_current_user

router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get("/", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(Category).order_by(Category.name).all()
    result = []
    for c in cats:
        count = db.query(sql_func.count(Product.id)).filter(Product.category_id == c.id).scalar()
        out = CategoryOut.model_validate(c)
        out.product_count = count
        result.append(out)
    return result


@router.post("/", response_model=CategoryOut, status_code=201)
def create_category(data: CategoryCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    existing = db.query(Category).filter(Category.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu kategoriya mavjud")
    cat = Category(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    out = CategoryOut.model_validate(cat)
    out.product_count = 0
    return out


@router.put("/{cat_id}", response_model=CategoryOut)
def update_category(cat_id: int, data: CategoryCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Kategoriya topilmadi")
    for k, v in data.model_dump().items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    count = db.query(sql_func.count(Product.id)).filter(Product.category_id == cat.id).scalar()
    out = CategoryOut.model_validate(cat)
    out.product_count = count
    return out


@router.delete("/{cat_id}")
def delete_category(cat_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Kategoriya topilmadi")
    db.delete(cat)
    db.commit()
    return {"detail": "O'chirildi"}
