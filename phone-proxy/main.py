import io
import os
import json
import base64
import shutil
import subprocess
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import phonenumbers
from phonenumbers import carrier, geocoder
import requests

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
GTC_CRED_B64 = os.path.join(BASE_DIR, "credentials.b64")

# ===== КЭШ =====
CACHE = {}
CACHE_TTL = 24 * 60 * 60

def cache_get(key):
    if key in CACHE:
        entry = CACHE[key]
        if time.time() - entry["ts"] < CACHE_TTL:
            return entry["data"]
        else:
            del CACHE[key]
    return None

def cache_set(key, data):
    CACHE[key] = {"data": data, "ts": time.time()}
    if len(CACHE) > 500:
        oldest = min(CACHE.keys(), key=lambda k: CACHE[k]["ts"])
        del CACHE[oldest]

def setup_credentials():
    config_dir = os.path.expanduser("~/.config/gtc")
    os.makedirs(config_dir, exist_ok=True)
    dst = os.path.join(config_dir, "credentials.json")
    if os.path.exists(GTC_CRED_B64):
        with open(GTC_CRED_B64, "r") as f:
            b64 = f.read().strip()
        decoded = base64.b64decode(b64).decode("utf-8")
        data = json.loads(decoded)
        with open(dst, "w") as f:
            json.dump(data, f, indent=2)
        print(f"[setup] credentials decoded → {dst}")
        return True
    return False

setup_credentials()

class PhoneRequest(BaseModel):
    phone: str

class EmailRequest(BaseModel):
    email: str

@app.get("/")
def read_root():
    return {"status": "proxy is running", "cache_size": len(CACHE)}

# ===== ОПЕРАТОР + РЕГИОН =====
def get_carrier_info(phone):
    try:
        parsed = phonenumbers.parse(phone, None)
        if not phonenumbers.is_valid_number(parsed):
            return {"valid": False, "error": "Неверный номер"}
        return {
            "valid": True,
            "carrier": carrier.name_for_number(parsed, "ru") or carrier.name_for_number(parsed, "en"),
            "region": geocoder.description_for_number(parsed, "ru") or geocoder.description_for_number(parsed, "en"),
            "region_en": geocoder.description_for_number(parsed, "en"),
            "country_code": phonenumbers.region_code_for_number(parsed),
            "line_type": "mobile" if phonenumbers.number_type(parsed) == phonenumbers.PhoneNumberType.MOBILE else "other",
            "formatted": phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.INTERNATIONAL),
            "country_code_num": parsed.country_code,
            "national_number": parsed.national_number,
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}

# ===== GETCONTACT =====
def get_gtc_data(phone):
    try:
        r = subprocess.run(
            ["python", GTC_SCRIPT, "search", phone, "--json", "-t", "profile"],
            capture_output=True, text=True, timeout=60, cwd=BASE_DIR
        )
        if r.returncode != 0:
            return {"error": r.stderr[:300] or "gtc failed"}
        data = json.loads(r.stdout)
        profile = data.get("result", {}).get("profile", {}) or {}
        spam = data.get("result", {}).get("spamInfo", {}) or {}
        return {
            "displayName": profile.get("displayName"),
            "name": profile.get("name"),
            "surname": profile.get("surname"),
            "tagCount": profile.get("tagCount"),
            "countryCode": profile.get("countryCode"),
            "displayNumber": profile.get("displayNumber"),
            "email": profile.get("email"),
            "profileImage": profile.get("profileImage"),
            "spamType": spam.get("type"),
            "spamDegree": spam.get("degree"),
        }
    except Exception as e:
        return {"error": str(e)}

# ===== HUDSON ROCK =====
def get_hudsonrock(phone):
    try:
        r = requests.get(
            f"https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-username?username={phone}",
            timeout=15
        )
        if r.status_code != 200:
            return {"error": f"HTTP {r.status_code}"}
        data = r.json()
        stealers = data.get("stealers", [])
        return {
            "compromised": len(stealers) > 0,
            "count": len(stealers),
            "stealers": stealers[:10]
        }
    except Exception as e:
        return {"error": str(e)}

# ===== IGNORANT =====
def get_social_networks(phone):
    try:
        clean = phone.replace("+", "")
        if clean.startswith("7"):
            country = "7"
            number = clean[1:]
        else:
            country = clean[:2]
            number = clean[2:]

        r = subprocess.run(
            ["python", "-m", "ignorant", country, number, "--no-color"],
            capture_output=True, text=True, timeout=90
        )
        lines = r.stdout.strip().split("\n")
        found = []
        for line in lines:
            if "[+]" in line:
                platform = line.split("[+]")[-1].strip()
                if platform:
                    found.append(platform)
        return {"found": found, "raw": r.stdout[:1000]}
    except Exception as e:
        return {"error": str(e)}

# ===== PHONSINT =====
def get_phonsint(phone):
    try:
        r = subprocess.run(
            ["phonsint", "-p", phone, "--verbose"],
            capture_output=True, text=True, timeout=120
        )

        lines = r.stdout.split("\n")
        found = []
        for line in lines:
            line = line.strip()
            if line.startswith("[✔]"):
                rest = line[3:].strip()
                site = rest.split("[")[0].strip() if "[" in rest else rest.split("(")[0].strip()
                url = ""
                if "[" in rest and "]" in rest:
                    url = rest.split("[")[1].split("]")[0]
                found.append({"site": site, "url": url, "status": "registered"})

        return {"found": found, "raw": r.stdout[:2000]}
    except Exception as e:
        return {"error": str(e)}

# ===== HOLEHE =====
def get_holehe(email):
    try:
        r = subprocess.run(
            ["holehe", email, "--no-color", "--only-used"],
            capture_output=True, text=True, timeout=90
        )
        lines = r.stdout.strip().split("\n")
        found = []
        for line in lines:
            if "[+]" in line:
                site = line.split("[+]")[-1].strip()
                if site:
                    found.append(site)
        return {"found": found, "raw": r.stdout[:1500]}
    except Exception as e:
        return {"error": str(e)}

# ===== ЭНДПОИНТ НОМЕРА =====
@app.post("/lookup")
async def lookup_phone(request: PhoneRequest):
    phone = request.phone.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
    if not phone.startswith("+"):
        phone = "+" + phone.lstrip("+")

    cached = cache_get(phone)
    if cached:
        cached["from_cache"] = True
        return cached

    carrier_info = get_carrier_info(phone)
    gtc_data = get_gtc_data(phone)
    hudson = get_hudsonrock(phone)
    social = get_social_networks(phone)

    try:
        phonsint_data = get_phonsint(phone)
    except Exception as e:
        phonsint_data = {"error": str(e)}

    result = {
        "success": True,
        "phone": phone,
        "from_cache": False,
        "carrier": carrier_info,
        "getcontact": gtc_data,
        "hudsonrock": hudson,
        "social": social,
        "phonsint": phonsint_data
    }

    cache_set(phone, result)
    return result

# ===== ЭНДПОИНТ EMAIL =====
@app.post("/email-lookup")
async def email_lookup(request: EmailRequest):
    email = request.email.strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")

    cache_key = "email:" + email
    cached = cache_get(cache_key)
    if cached:
        cached["from_cache"] = True
        return cached

    holehe_result = get_holehe(email)

    result = {
        "success": True,
        "email": email,
        "from_cache": False,
        "holehe": holehe_result
    }

    cache_set(cache_key, result)
    return result

@app.get("/cache")
def cache_status():
    return {"size": len(CACHE), "keys": list(CACHE.keys())[:50]}

@app.get("/phonsint-test")
def phonsint_test():
    phone = "+79533950127"
    try:
        r = subprocess.run(
            ["phonsint", "-p", phone, "--verbose"],
            capture_output=True, text=True, timeout=120
        )
        return {
            "returncode": r.returncode,
            "stdout": r.stdout[:3000],
            "stderr": r.stderr[:2000],
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/debug")
def debug():
    config_dir = os.path.expanduser("~/.config/gtc")
    creds_path = os.path.join(config_dir, "credentials.json")
    info = {
        "base_dir": BASE_DIR,
        "b64_exists": os.path.exists(GTC_CRED_B64),
        "config_exists": os.path.exists(creds_path),
        "cache_size": len(CACHE),
    }
    if os.path.exists(creds_path):
        try:
            with open(creds_path) as f:
                data = json.load(f)
            info["creds_ok"] = True
            info["creds_accounts"] = list(data.get("credentials", {}).keys())
        except Exception as e:
            info["creds_ok"] = False
            info["creds_error"] = str(e) 
    return info    
