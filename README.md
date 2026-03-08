# SKLAD WMS (Ombor Boshqaruv Tizimi)

Bu loyiha omborni aqlli boshqarish, kirim-chiqimlarni hisobga olish va AI (Sun'iy Intellekt) yordamchisi orqali buyruqlarni matnli tilda qabul qilish maqsadida yaratilgan tizimdir.

## Asosiy Imkoniyatlar
- 📦 **Mahsulotlar katalogi**: Mahsulotlarni SKU va zaxira limiti bilan qo'shish, ro'yxatini yuritish.
- 🔄 **Kirim va Chiqim**: Maxsus formalari orqali mahsulot omborga kirimi va sotilishini qulay qayd etish.
- 💵 **Qarzdorlik**: Mijozlar yoki ta'minotchilar bilan to'liq yoki qisman hisob-kitob qilish, avtomatik qarz yozish.
- 🤖 **AI Yordamchi**: O'zbek tilidagi matnli buyruqlarni ("Ali akaga 500 ta sement qarzga berildi") tahlil qilib bazaga avtomatik kiritib qo'yuvchi integratsiya (OpenRouter.ai orqali).
- 📱 **Mobile Responsive**: Telefon va planshetlar uchun to'liq moslashtirilgan qulay UI.
- 🔐 **Xavfsizlik**: Foydalanuvchi tizimi (JWT Token asosida) va rollar paneli (Admin, Omborchi).

## Texnologik Stack
**Backend**: Python, FastAPI, SQLite (SQLAlchemy ORM), JWT, python-dotenv, OpenAI SDK (AI Integratsiyasi)
**Frontend**: React (Vite), React Router, Vanilla CSS (Modern UI variables)

## Qanday Ishga Tushiriladi?

### 1. Backend ni yoqish
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
# AI ishlashi uchun .env fayl yarating (.env.example ga qarang)
uvicorn main:app --reload
```

### 2. Frontend ni yoqish
```bash
cd frontend
npm install
npm run dev
```

## AI Yordamchi Haqida
Tizimdagi AI funksiyasi `OpenRouter.ai` tarmog'ini `google/gemini-2.5-flash` modeli bilan ishlatadi. Ishlashi uchun sizning `.env` faylingizda to'g'ri `OPENROUTER_API_KEY` kiritilgan bo'lishi kerak.
