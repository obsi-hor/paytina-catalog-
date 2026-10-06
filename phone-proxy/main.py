from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import phone_number_lookup
import asyncio

app = FastAPI()

# Разрешаем запросы только с твоего сайта
origins = [
    "https://paytina-catalog.de5.net",
    "http://localhost:3000",  # для локальной отладки
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PhoneRequest(BaseModel):
    phone: str

@app.get("/")
def read_root():
    return {"status": "proxy is running"}

@app.post("/lookup")
async def lookup_phone(request: PhoneRequest):
    phone = request.phone.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
    
    try:
        # Запускаем синхронную библиотеку в отдельном потоке, чтобы не блокировать FastAPI
        result = await asyncio.to_thread(phone_number_lookup.lookup, phone)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}
