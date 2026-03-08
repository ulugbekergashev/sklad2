import json
from openai import OpenAI
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import Product, Supplier, StockMovement, Debt, DebtPayment
from auth import get_current_user
import os
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    print("WARNING: OPENROUTER_API_KEY topilmadi!")

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=OPENROUTER_API_KEY,
)

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])

SYSTEM_PROMPT = """Sen ombor boshqaruv tizimining AI yordamchisisan. Foydalanuvchi o'zbek tilida buyruq beradi.
Sen buyruqni tahlil qilib, JSON formatda javob ber.

Mavjud amallar:
1. "incoming" — kirim (mahsulot qabul qilish)
2. "outgoing" — chiqim (mahsulot chiqarish)
3. "add_product" — yangi mahsulot qo'shish
4. "add_debt" — qarz yozish
5. "add_payment" — qarzga to'lov qilish
6. "info" — ma'lumot berish (faqat matnli javob)

DOIM quyidagi JSON formatda javob ber:

Kirim/Chiqim uchun:
{"action": "incoming" yoki "outgoing", "product_name": "mahsulot nomi", "quantity": son, "unit_price": narx, "paid_amount": to'langan_summa yoki null, "counterparty_name": "mijoz/yetkazuvchi ismi", "counterparty_phone": "telefon", "notes": "izoh", "message": "foydalanuvchiga xabar"}

Yangi mahsulot uchun:
{"action": "add_product", "name": "nomi", "sku": "artikul", "unit": "birlik", "price": narx, "min_stock": min_zaxira, "message": "xabar"}

Qarz uchun:
{"action": "add_debt", "debt_type": "receivable" yoki "payable", "counterparty_name": "ism", "counterparty_phone": "telefon", "total_amount": summa, "description": "izoh", "message": "xabar"}

To'lov uchun:
{"action": "add_payment", "debt_id": raqam, "amount": summa, "payment_method": "naqd/karta/bank", "message": "xabar"}

Ma'lumot javob uchun:
{"action": "info", "message": "javob matni"}

MUHIM:
- Faqat JSON javob ber, boshqa hech narsa yozma, masalan faqat '```json' degan narsasiz
- Agar narx yoki miqdor ko'rsatilmagan bo'lsa, 0 yoki null qo'y
- paid_amount: agar to'liq to'langan yoki noaniq bo'lsa null qo'y
- Agar tushunmasang, action "info" bilan savol ber
- message da doim o'zbek tilida yoz, qisqa va aniq
"""


class AIRequest(BaseModel):
    message: str


class AIResponse(BaseModel):
    action: str
    message: str
    data: dict = {}
    success: bool = True


@router.post("/command", response_model=AIResponse)
def ai_command(
    req: AIRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Mavjud mahsulotlar va qarzlar kontekstini olish
    products = db.query(Product).all()
    product_list = ", ".join([f"{p.name} (SKU:{p.sku}, narx:{p.price}, zaxira:{p.current_stock})" for p in products[:30]])

    debts = db.query(Debt).filter(Debt.status != "paid").all()
    debt_list = ", ".join([f"ID:{d.id} {d.counterparty_name} - {d.remaining_amount} so'm ({d.debt_type})" for d in debts[:20]])

    context = f"""
Mavjud mahsulotlar: {product_list or 'Hozircha mahsulot yo\'q'}
Faol qarzlar: {debt_list or 'Qarz yo\'q'}
"""

    try:
        completion = client.chat.completions.create(
            model="google/gemini-2.5-flash",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT + "\n\nKONTEKST:\n" + context},
                {"role": "user", "content": req.message}
            ],
            response_format={"type": "json_object"},
            max_tokens=1000,
            timeout=15.0,
        )
        content = completion.choices[0].message.content
        if content.startswith("```json"):
            content = content[7:-3]
        result = json.loads(content)
    except Exception as e:
        return AIResponse(action="info", message=f"AI xatosi: {str(e)}", success=False)

    action = result.get("action", "info")
    msg = result.get("message", "")

    # ─── Amalni bajarish ───
    try:
        if action == "incoming":
            return _do_movement(db, current_user, result, "IN")

        elif action == "outgoing":
            return _do_movement(db, current_user, result, "OUT")

        elif action == "add_product":
            return _do_add_product(db, result)

        elif action == "add_debt":
            return _do_add_debt(db, current_user, result)

        elif action == "add_payment":
            return _do_add_payment(db, result)

        else:
            return AIResponse(action="info", message=msg, data=result)

    except Exception as e:
        return AIResponse(action="error", message=f"Xatolik: {str(e)}", success=False)


def _do_movement(db, user, data, movement_type):
    product_name = data.get("product_name", "")
    product = db.query(Product).filter(Product.name.ilike(f"%{product_name}%")).first()

    if not product:
        return AIResponse(
            action="info",
            message=f"'{product_name}' nomli mahsulot topilmadi. Avval mahsulotni qo'shing.",
            success=False,
        )

    quantity = int(data.get("quantity", 0))
    unit_price = float(data.get("unit_price") or product.price or 0)

    if quantity <= 0:
        return AIResponse(action="info", message="Miqdor kiritilmadi", success=False)

    if movement_type == "OUT" and product.current_stock < quantity:
        return AIResponse(
            action="info",
            message=f"Zaxira yetarli emas. {product.name}: mavjud {product.current_stock}, so'ralgan {quantity}",
            success=False,
        )

    # Stock yangilash
    if movement_type == "OUT":
        product.current_stock -= quantity
    else:
        product.current_stock += quantity

    movement = StockMovement(
        product_id=product.id,
        movement_type=movement_type,
        quantity=quantity,
        unit_price=unit_price,
        created_by=user.id,
        notes=data.get("notes", "AI orqali"),
    )
    db.add(movement)
    db.flush()

    # Qarz yaratish
    total = quantity * unit_price
    paid = data.get("paid_amount")
    if paid is not None and total > 0 and float(paid) < total:
        remaining = total - float(paid)
        debt_type = "receivable" if movement_type == "OUT" else "payable"
        debt = Debt(
            debt_type=debt_type,
            counterparty_name=data.get("counterparty_name", "Noma'lum"),
            counterparty_phone=data.get("counterparty_phone", ""),
            total_amount=total,
            paid_amount=float(paid),
            remaining_amount=remaining,
            description=f"{product.name} x{quantity} — AI",
            movement_id=movement.id,
            created_by=user.id,
        )
        db.add(debt)
        msg = data.get("message", "") + f"\n💰 Qarz: {remaining:,.0f} so'm"
    else:
        msg = data.get("message", "")

    db.commit()
    type_label = "Kirim" if movement_type == "IN" else "Chiqim"
    return AIResponse(
        action=f"{'incoming' if movement_type == 'IN' else 'outgoing'}",
        message=f"✅ {type_label}: {product.name} x{quantity}, narx: {unit_price:,.0f} so'm\n{msg}",
        data={"product_id": product.id, "quantity": quantity, "total": total},
        success=True,
    )


def _do_add_product(db, data):
    name = data.get("name", "")
    sku = data.get("sku", name[:3].upper() + "001")
    existing = db.query(Product).filter(Product.sku == sku).first()
    if existing:
        return AIResponse(action="info", message=f"Bu SKU ({sku}) mavjud", success=False)

    product = Product(
        name=name,
        sku=sku,
        unit=data.get("unit", "dona"),
        price=float(data.get("price", 0)),
        min_stock=int(data.get("min_stock", 0)),
    )
    db.add(product)
    db.commit()
    return AIResponse(
        action="add_product",
        message=f"✅ Mahsulot qo'shildi: {name} (SKU: {sku})",
        data={"product_id": product.id, "name": name},
    )


def _do_add_debt(db, user, data):
    debt = Debt(
        debt_type=data.get("debt_type", "receivable"),
        counterparty_name=data.get("counterparty_name", ""),
        counterparty_phone=data.get("counterparty_phone", ""),
        total_amount=float(data.get("total_amount", 0)),
        remaining_amount=float(data.get("total_amount", 0)),
        description=data.get("description", "AI orqali"),
        created_by=user.id,
    )
    db.add(debt)
    db.commit()
    return AIResponse(
        action="add_debt",
        message=f"✅ Qarz yozildi: {debt.counterparty_name} — {debt.total_amount:,.0f} so'm",
        data={"debt_id": debt.id},
    )


def _do_add_payment(db, data):
    debt_id = data.get("debt_id")
    debt = db.query(Debt).filter(Debt.id == debt_id).first()
    if not debt:
        return AIResponse(action="info", message=f"Qarz ID:{debt_id} topilmadi", success=False)

    amount = float(data.get("amount", 0))
    if amount <= 0 or amount > debt.remaining_amount:
        return AIResponse(action="info", message=f"To'lov miqdori noto'g'ri (qoldiq: {debt.remaining_amount:,.0f})", success=False)

    payment = DebtPayment(
        debt_id=debt.id,
        amount=amount,
        payment_method=data.get("payment_method", "naqd"),
    )
    db.add(payment)
    debt.paid_amount += amount
    debt.remaining_amount = debt.total_amount - debt.paid_amount
    if debt.remaining_amount <= 0:
        debt.remaining_amount = 0
        debt.status = "paid"
    db.commit()

    return AIResponse(
        action="add_payment",
        message=f"✅ To'lov qabul qilindi: {amount:,.0f} so'm → {debt.counterparty_name}\nQoldiq: {debt.remaining_amount:,.0f} so'm",
        data={"debt_id": debt.id, "remaining": debt.remaining_amount},
    )
