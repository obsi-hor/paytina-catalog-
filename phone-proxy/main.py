import io
import importlib.util
import contextlib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

origins = [
    "https://paytina-catalog.de5.net",
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

spec = importlib.util.spec_from_file_location("lookup_original", "lookup-original.py")
lookup_original = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lookup_original)

class PhoneRequest(BaseModel):
    phone: str

@app.get("/")
def read_root():
    return {"status": "proxy is running"}

@app.post("/lookup")
async def lookup_phone(request: PhoneRequest):
    phone = request.phone.strip().replace("+", "").replace(" ", "").replace("-", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")

    captured_output = io.StringIO()
    error = None

    with contextlib.redirect_stdout(captured_output):
        # ===== Sync.ME =====
        try:
            lookup_original.Sync_Me().start_styncme(phone, more=True)
        except Exception as e:
            print(f"[Sync_ME error] {e}")

        # ===== CallerID =====
        try:
            lookup_original.CallerID().start_callerid_check(phone, more=True)
        except Exception as e:
            print(f"[CallerID error] {e}")

        # ===== CallApp =====
        try:
            lookup_original.CallApp().send_request(phone, more=True)
        except Exception as e:
            try:
                lookup_original.CallApp().send_request(phone)
            except Exception as e2:
                print(f"[CallApp error] {e2}")

        # ===== Eyecon =====
        try:
            lookup_original.Eyecon().send_request_pic(phone, more=True)
            lookup_original.Eyecon().send_request_getname(phone, more=True)
        except Exception:
            try:
                lookup_original.Eyecon().send_request_pic(phone)
                lookup_original.Eyecon().send_request_getname(phone)
            except Exception as e3:
                print(f"[Eyecon error] {e3}")

        # ===== Truecaller =====
        try:
            lookup_original.Truecaller().send_request(phone, more=True)
        except Exception as e:
            try:
                lookup_original.Truecaller().send_request(phone)
            except Exception as e2:
                print(f"[Truecaller error] {e2}")

    raw = captured_output.getvalue()

    return {
        "success": error is None,
        "phone": phone,
        "error": error,
        "raw_output": raw
    }
