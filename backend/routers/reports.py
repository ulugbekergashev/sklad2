import io
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from openpyxl import Workbook

from database import get_db
from models import StockMovement, Product, Category
from auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/movements")
def movements_report(
    date_from: str = Query("", description="YYYY-MM-DD"),
    date_to: str = Query("", description="YYYY-MM-DD"),
    movement_type: str = Query(""),
    category_id: int = Query(0),
    db: Session = Depends(get_db),
):
    q = db.query(StockMovement).join(Product)
    if date_from:
        try:
            df = datetime.strptime(date_from, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            q = q.filter(StockMovement.created_at >= df)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.strptime(date_to, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59, tzinfo=timezone.utc
            )
            q = q.filter(StockMovement.created_at <= dt)
        except ValueError:
            pass
    if movement_type:
        q = q.filter(StockMovement.movement_type == movement_type.upper())
    if category_id:
        q = q.filter(Product.category_id == category_id)

    movements = q.order_by(StockMovement.created_at.desc()).all()

    total_in = sum(m.quantity for m in movements if m.movement_type == "IN")
    total_out = sum(m.quantity for m in movements if m.movement_type == "OUT")
    total_in_value = sum(m.quantity * m.unit_price for m in movements if m.movement_type == "IN")
    total_out_value = sum(m.quantity * m.unit_price for m in movements if m.movement_type == "OUT")

    items = []
    for m in movements:
        items.append({
            "id": m.id,
            "product_name": m.product.name if m.product else "",
            "product_sku": m.product.sku if m.product else "",
            "movement_type": m.movement_type,
            "quantity": m.quantity,
            "unit_price": m.unit_price,
            "total": m.quantity * m.unit_price,
            "supplier_name": m.supplier.name if m.supplier else "",
            "reference_number": m.reference_number,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        })

    return {
        "items": items,
        "summary": {
            "total_in": total_in,
            "total_out": total_out,
            "total_in_value": round(total_in_value, 2),
            "total_out_value": round(total_out_value, 2),
        },
    }


@router.get("/stock")
def stock_report(
    category_id: int = Query(0),
    db: Session = Depends(get_db),
):
    q = db.query(Product)
    if category_id:
        q = q.filter(Product.category_id == category_id)
    products = q.order_by(Product.name).all()

    items = []
    total_value = 0
    for p in products:
        value = p.current_stock * p.price
        total_value += value
        items.append({
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "category": p.category.name if p.category else "",
            "current_stock": p.current_stock,
            "min_stock": p.min_stock,
            "unit": p.unit,
            "price": p.price,
            "value": round(value, 2),
            "status": "low" if (p.min_stock > 0 and p.current_stock <= p.min_stock) else "ok",
        })

    return {"items": items, "total_value": round(total_value, 2)}


@router.get("/export/excel")
def export_excel(
    report_type: str = Query("stock", description="stock or movements"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    wb = Workbook()
    ws = wb.active

    if report_type == "stock":
        ws.title = "Zaxira hisoboti"
        ws.append(["#", "Nomi", "SKU", "Kategoriya", "Zaxira", "Min. zaxira", "Birlik", "Narx", "Qiymat"])
        products = db.query(Product).order_by(Product.name).all()
        for i, p in enumerate(products, 1):
            ws.append([
                i, p.name, p.sku,
                p.category.name if p.category else "",
                p.current_stock, p.min_stock, p.unit, p.price,
                round(p.current_stock * p.price, 2),
            ])
    else:
        ws.title = "Harakatlar hisoboti"
        ws.append(["#", "Sana", "Mahsulot", "SKU", "Turi", "Miqdor", "Narx", "Jami", "Yetkazuvchi"])
        movements = db.query(StockMovement).order_by(StockMovement.created_at.desc()).all()
        for i, m in enumerate(movements, 1):
            ws.append([
                i,
                m.created_at.strftime("%Y-%m-%d %H:%M") if m.created_at else "",
                m.product.name if m.product else "",
                m.product.sku if m.product else "",
                "Kirim" if m.movement_type == "IN" else "Chiqim",
                m.quantity, m.unit_price, round(m.quantity * m.unit_price, 2),
                m.supplier.name if m.supplier else "",
            ])

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    filename = f"sklad_{report_type}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
