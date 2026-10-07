import io
import os
import json
import shutil
import subprocess
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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GTC_SCRIPT = os.path.join(BASE_DIR, "gtc.py")
GTC_CRED_FILE = os.path.join(BASE_DIR, "credentials.json")

# Копируем credentials.json в ~/.config/gtc/ при старте сервиса
def setup_credentials():
    config_dir = os.path.expanduser("~/.config/gtc")
    os.makedirs(config_dir, exist_ok=True)
    dst = os.path.join(config_dir, "credentials.json")
    if os.path.exists(GTC_CRED_FILE):
        shutil.copy(GTC_CRED_FILE, dst)
        print(f"[setup] credentials copied to {dst}")

setup_credentials()

class PhoneRequest(BaseModel):
    phone: str

@app.get("/")
def read_root():
    return {"status": "proxy is running"}

@app.get("/gtc-test")
def gtc_test():
    """Проверка: работает ли GetContact CLI."""
    try:
        result = subprocess.run(
            ["python", GTC_SCRIPT, "--help"],
            capture_output=True, text=True, timeout=15, cwd=BASE_DIR
        )
        return {
            "stdout": result.stdout[:500],
            "stderr": result.stderr[:500],
            "code": result.returncode
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/lookup")
async def lookup_phone(request: PhoneRequest):
    phone = request.phone.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")

    if not phone.startswith("+"):
        phone = "+" + phone.lstrip("+")

    result = {
        "success": True,
        "phone": phone,
        "getcontact": None,
        "error": None
    }

    # ===== GETCONTACT =====
    try:
        r = subprocess.run(
            ["python", GTC_SCRIPT, "search", phone, "--json", "-t", "tags"],
            capture_output=True, text=True, timeout=40, cwd=BASE_DIR
        )

        if r.returncode != 0:
            result["getcontact"] = {"error": r.stderr[:500] or "gtc failed"}
        else:
            data = json.loads(r.stdout)
            profile = data.get("result", {}).get("profile", {}) or {}
            tags_raw = data.get("result", {}).get("tags", []) or []
            spam = data.get("result", {}).get("spamInfo", {}) or {}

            result["getcontact"] = {
                "displayName": profile.get("displayName"),
                "tagCount": profile.get("tagCount"),
                "countryCode": profile.get("countryCode"),
                "displayNumber": profile.get("displayNumber"),
                "email": profile.get("email"),
                "spamType": spam.get("type"),
                "spamDegree": spam.get("degree"),
                "tags": [{"tag": t.get("tag"), "count": t.get("count")} for t in tags_raw]
            }
    except Exception as e:
        result["getcontact"] = {"error": str(e)}
        result["error"] = str(e)

    return result
