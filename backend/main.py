from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from models import User
from auth import hash_password
from database import SessionLocal
import traceback
from fastapi.responses import JSONResponse

# Import routers
from routers.auth import router as auth_router
from routers.categories import router as categories_router
from routers.suppliers import router as suppliers_router
from routers.products import router as products_router
from routers.movements import router as movements_router
from routers.inventory import router as inventory_router
from routers.dashboard import router as dashboard_router
from routers.reports import router as reports_router
from routers.debts import router as debts_router
from routers.ai_assistant import router as ai_router

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sklad WMS", version="1.0.0")

@app.exception_handler(Exception)
async def debug_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "message": "Internal Server Error",
            "error": str(exc),
            "traceback": traceback.format_exc()
        }
    )

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://sklad-beta.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(categories_router)
app.include_router(suppliers_router)
app.include_router(products_router)
app.include_router(movements_router)
app.include_router(inventory_router)
app.include_router(dashboard_router)
app.include_router(reports_router)
app.include_router(debts_router)
app.include_router(ai_router)


@app.on_event("startup")
def seed_admin():
    """Create default admin user if not exists."""
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                password_hash=hash_password("admin123"),
                full_name="Administrator",
                role="admin",
            )
            db.add(admin)
            db.commit()
            print("✅ Admin foydalanuvchi yaratildi: admin / admin123")
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "Sklad WMS API", "version": "1.0.0", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
