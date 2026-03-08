from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func, cast, Date

from database import get_db
from models import Product, StockMovement, Category
from schemas import DashboardStats, DashboardTrend, MovementOut
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    total_products = db.query(sql_func.count(Product.id)).scalar() or 0
    total_value = db.query(
        sql_func.coalesce(sql_func.sum(Product.price * Product.current_stock), 0)
    ).scalar()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_in = db.query(
        sql_func.coalesce(sql_func.sum(StockMovement.quantity), 0)
    ).filter(
        StockMovement.movement_type == "IN",
        StockMovement.created_at >= today_start,
    ).scalar()

    today_out = db.query(
        sql_func.coalesce(sql_func.sum(StockMovement.quantity), 0)
    ).filter(
        StockMovement.movement_type == "OUT",
        StockMovement.created_at >= today_start,
    ).scalar()

    low_stock = db.query(sql_func.count(Product.id)).filter(
        Product.current_stock <= Product.min_stock,
        Product.min_stock > 0,
    ).scalar() or 0

    categories_count = db.query(sql_func.count(Category.id)).scalar() or 0

    return DashboardStats(
        total_products=total_products,
        total_value=round(float(total_value), 2),
        today_in=int(today_in),
        today_out=int(today_out),
        low_stock_count=low_stock,
        categories_count=categories_count,
    )


@router.get("/trend", response_model=list[DashboardTrend])
def get_trend(days: int = Query(7, le=30), db: Session = Depends(get_db)):
    result = []
    now = datetime.now(timezone.utc)
    for i in range(days - 1, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        incoming = db.query(
            sql_func.coalesce(sql_func.sum(StockMovement.quantity), 0)
        ).filter(
            StockMovement.movement_type == "IN",
            StockMovement.created_at >= day_start,
            StockMovement.created_at < day_end,
        ).scalar()

        outgoing = db.query(
            sql_func.coalesce(sql_func.sum(StockMovement.quantity), 0)
        ).filter(
            StockMovement.movement_type == "OUT",
            StockMovement.created_at >= day_start,
            StockMovement.created_at < day_end,
        ).scalar()

        result.append(DashboardTrend(
            date=day_start.strftime("%Y-%m-%d"),
            incoming=int(incoming),
            outgoing=int(outgoing),
        ))
    return result


@router.get("/recent")
def get_recent(limit: int = Query(10, le=50), db: Session = Depends(get_db)):
    movements = db.query(StockMovement).order_by(
        StockMovement.created_at.desc()
    ).limit(limit).all()
    result = []
    for m in movements:
        result.append({
            "id": m.id,
            "product_name": m.product.name if m.product else "",
            "product_sku": m.product.sku if m.product else "",
            "movement_type": m.movement_type,
            "quantity": m.quantity,
            "created_at": m.created_at.isoformat() if m.created_at else "",
            "created_by_name": m.created_by_user.full_name if m.created_by_user else "",
        })
    return result


@router.get("/low-stock")
def get_low_stock(db: Session = Depends(get_db)):
    products = db.query(Product).filter(
        Product.current_stock <= Product.min_stock,
        Product.min_stock > 0,
    ).order_by(Product.current_stock).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "current_stock": p.current_stock,
            "min_stock": p.min_stock,
            "unit": p.unit,
        }
        for p in products
    ]
