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

def setup_credentials():
    config_dir = os.path.expanduser("~/.config/gtc")
    os.makedirs(config_dir, exist_ok=True)
    dst = os.path.join(config_dir, "credentials.json")
    if os.path.exists(GTC_CRED_FILE):
        shutil.copy(GTC_CRED_FILE, dst)
        print(f"[setup] credentials copied to {dst}")
        return True
    print(f"[setup] credentials.json NOT FOUND at {GTC_CRED_FILE}")
    return False

setup_credentials()

class PhoneRequest(BaseModel):
    phone: str

@app.get("/")
def read_root():
    return {"status": "proxy is running"}

@app.get("/debug")
def debug():
    """Показывает состояние бэкенда."""
    config_dir = os.path.expanduser("~/.config/gtc")
    creds_path = os.path.join(config_dir, "credentials.json")

    info = {
        "base_dir": BASE_DIR,
        "gtc_script_exists": os.path.exists(GTC_SCRIPT),
        "gtc_cred_file_exists": os.path.exists(GTC_CRED_FILE),
        "config_dir_exists": os.path.exists(config_dir),
        "creds_in_config_exists": os.path.exists(creds_path),
        "base_dir_files": os.listdir(BASE_DIR) if os.path.exists(BASE_DIR) else [],
    }

    if os.path.exists(creds_path):
        try:
            with open(creds_path) as f:
                data = json.load(f)
            info["creds_keys"] = list(data.get("credentials", {}).keys())
        except Exception as e:
            info["creds_error"] = str(e)

    # Проверяем запуск gtc.py
    try:
        r = subprocess.run(
            ["python", GTC_SCRIPT, "search", "+79533950127", "--json", "-t", "tags"],
            capture_output=True, text=True, timeout=40, cwd=BASE_DIR
        )
        info["gtc_returncode"] = r.returncode
        info["gtc_stdout"] = r.stdout[:1000]
        info["gtc_stderr"] = r.stderr[:1000]
    except Exception as e:
        info["gtc_error"] = str(e)

    return info

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

    try:
        r = subprocess.run(
            ["python", GTC_SCRIPT, "search", phone, "--json", "-t", "tags"],
            capture_output=True, text=True, timeout=40, cwd=BASE_DIR
        )

        if r.returncode != 0:
            result["getcontact"] = {"error": r.stderr[:500] or "gtc failed"}
            result["error"] = r.stderr[:500]
        else:
            try:
                data = json.loads(r.stdout)
            except Exception as e:
                result["getcontact"] = {"error": f"JSON parse error: {e}. Output: {r.stdout[:300]}"}
                result["error"] = result["getcontact"]["error"]
                return result

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
