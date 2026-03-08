import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Product, Category
from schemas import ProductCreate, ProductUpdate, ProductOut
from auth import get_current_user

router = APIRouter(prefix="/api/products", tags=["Products"])


def _to_out(p: Product) -> ProductOut:
    out = ProductOut.model_validate(p)
    out.category_name = p.category.name if p.category else None
    return out


@router.get("/", response_model=list[ProductOut])
def list_products(
    search: str = Query("", description="Qidiruv"),
    category_id: int = Query(0, description="Kategoriya filter"),
    low_stock: bool = Query(False, description="Faqat kam qolganlar"),
    db: Session = Depends(get_db),
):
    q = db.query(Product)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (Product.name.ilike(like))
            | (Product.sku.ilike(like))
            | (Product.barcode.ilike(like))
        )
    if category_id:
        q = q.filter(Product.category_id == category_id)
    if low_stock:
        q = q.filter(Product.current_stock <= Product.min_stock)
    products = q.order_by(Product.name).all()
    return [_to_out(p) for p in products]


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    return _to_out(p)


@router.post("/", response_model=ProductOut, status_code=201)
def create_product(data: ProductCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    # Generate barcode if not provided
    barcode = data.barcode or f"SKL-{uuid.uuid4().hex[:8].upper()}"
    existing_sku = db.query(Product).filter(Product.sku == data.sku).first()
    if existing_sku:
        raise HTTPException(status_code=400, detail="Bu SKU mavjud")
    existing_barcode = db.query(Product).filter(Product.barcode == barcode).first()
    if existing_barcode:
        barcode = f"SKL-{uuid.uuid4().hex[:8].upper()}"

    product = Product(**data.model_dump(exclude={"barcode"}), barcode=barcode)
    db.add(product)
    db.commit()
    db.refresh(product)
    return _to_out(product)


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return _to_out(p)


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    db.delete(p)
    db.commit()
    return {"detail": "O'chirildi"}
