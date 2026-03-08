from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from database import get_db
from models import Debt, DebtPayment
from schemas import DebtCreate, DebtOut, DebtPaymentCreate, DebtPaymentOut, DebtStats
from auth import get_current_user

router = APIRouter(prefix="/api/debts", tags=["Debts"])


@router.get("/stats", response_model=DebtStats)
def debt_stats(db: Session = Depends(get_db), _=Depends(get_current_user)):
    now = datetime.now(timezone.utc)

    receivables = db.query(Debt).filter(Debt.debt_type == "receivable", Debt.status != "paid").all()
    payables = db.query(Debt).filter(Debt.debt_type == "payable", Debt.status != "paid").all()

    total_receivable = sum(d.remaining_amount for d in receivables)
    total_payable = sum(d.remaining_amount for d in payables)

    overdue_rec = [d for d in receivables if d.due_date and d.due_date < now]
    overdue_pay = [d for d in payables if d.due_date and d.due_date < now]

    overdue_receivable = sum(d.remaining_amount for d in overdue_rec)
    overdue_payable = sum(d.remaining_amount for d in overdue_pay)

    return DebtStats(
        total_receivable=total_receivable,
        total_payable=total_payable,
        overdue_receivable=overdue_receivable,
        overdue_payable=overdue_payable,
        receivable_count=len(receivables),
        payable_count=len(payables),
        overdue_count=len(overdue_rec) + len(overdue_pay),
    )


@router.get("/", response_model=list[DebtOut])
def list_debts(
    debt_type: str = Query("", description="receivable or payable"),
    status: str = Query("", description="active, paid, overdue"),
    search: str = Query("", description="Qidiruv"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Debt)
    if debt_type:
        q = q.filter(Debt.debt_type == debt_type)
    if status:
        q = q.filter(Debt.status == status)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (Debt.counterparty_name.ilike(like))
            | (Debt.counterparty_phone.ilike(like))
            | (Debt.description.ilike(like))
        )
    debts = q.order_by(Debt.created_at.desc()).all()

    # Auto-update overdue status
    now = datetime.now(timezone.utc)
    for d in debts:
        if d.status == "active" and d.due_date and d.due_date < now:
            d.status = "overdue"
            db.commit()

    return debts


@router.post("/", response_model=DebtOut, status_code=201)
def create_debt(data: DebtCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    debt = Debt(
        debt_type=data.debt_type,
        counterparty_name=data.counterparty_name,
        counterparty_phone=data.counterparty_phone,
        total_amount=data.total_amount,
        remaining_amount=data.total_amount,
        description=data.description,
        due_date=data.due_date,
        movement_id=data.movement_id,
        created_by=user.id,
    )
    db.add(debt)
    db.commit()
    db.refresh(debt)
    return debt


@router.get("/{debt_id}", response_model=DebtOut)
def get_debt(debt_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    debt = db.query(Debt).filter(Debt.id == debt_id).first()
    if not debt:
        raise HTTPException(status_code=404, detail="Qarz topilmadi")
    return debt


@router.delete("/{debt_id}")
def delete_debt(debt_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    debt = db.query(Debt).filter(Debt.id == debt_id).first()
    if not debt:
        raise HTTPException(status_code=404, detail="Qarz topilmadi")
    db.delete(debt)
    db.commit()
    return {"detail": "O'chirildi"}


@router.post("/{debt_id}/payments", response_model=DebtOut)
def add_payment(
    debt_id: int,
    data: DebtPaymentCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    debt = db.query(Debt).filter(Debt.id == debt_id).first()
    if not debt:
        raise HTTPException(status_code=404, detail="Qarz topilmadi")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="To'lov miqdori 0 dan katta bo'lishi kerak")
    if data.amount > debt.remaining_amount:
        raise HTTPException(status_code=400, detail="To'lov miqdori qoldiq qarzdan oshmasligi kerak")

    payment = DebtPayment(
        debt_id=debt.id,
        amount=data.amount,
        payment_method=data.payment_method,
        notes=data.notes,
    )
    db.add(payment)

    debt.paid_amount += data.amount
    debt.remaining_amount = debt.total_amount - debt.paid_amount

    if debt.remaining_amount <= 0:
        debt.remaining_amount = 0
        debt.status = "paid"

    db.commit()
    db.refresh(debt)
    return debt
