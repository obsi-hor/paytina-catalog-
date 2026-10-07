import json
import os
import gzip
import hashlib
from datetime import datetime
import requests

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "credentials.json")

def load_credentials():
    with open(CONFIG_PATH, "r") as f:
        data = json.load(f)

    # Достаём первый аккаунт из credentials
    creds = data.get("credentials", {})
    if not creds:
        raise Exception("No credentials found")

    phone = list(creds.keys())[0]
    acc = creds[phone]
    return {
        "phone": acc["phoneNumber"],
        "clientDeviceId": acc["clientDeviceId"],
        "finalKey": acc["finalKey"],
        "token": acc["token"]
    }

def build_headers(acc):
    # Заголовки, которые использует официальное приложение GetContact
    return {
        "User-Agent": "okhttp/3.12.13",
        "Accept-Encoding": "gzip",
        "X-Client-Device-Id": acc["clientDeviceId"],
        "X-Client-Final-Key": acc["finalKey"],
        "X-Client-Token": acc["token"],
        "Content-Type": "application/json; charset=utf-8",
        "gtc-version": "8.4.0",
        "gtc-locale": "ru",
        "gtc-country": "RU"
    }

def gzip_compress(data: dict) -> bytes:
    raw = json.dumps(data, separators=(',', ':')).encode('utf-8')
    return gzip.compress(raw)

def gzip_decompress(resp) -> dict:
    # Ответ приходит gzip-сжатым, requests иногда сам распаковывает
    try:
        return resp.json()
    except Exception:
        raw = gzip.decompress(resp.content).decode('utf-8')
        return json.loads(raw)

def search_phone(phone: str) -> dict:
    acc = load_credentials()
    headers = build_headers(acc)

    payload = {
        "phoneNumber": phone,
        "searchedHimself": False
    }
    body = gzip_compress(payload)

    url = "https://api.getcontact.com/v2.8/search"

    r = requests.post(
        url,
        headers=headers,
        data=body,
        timeout=20,
        verify=True
    )

    if r.status_code != 200:
        return {
            "success": False,
            "error": f"HTTP {r.status_code}: {r.text[:200]}"
        }

    data = gzip_decompress(r)

    profile = data.get("result", {}).get("profile", {})
    spam = data.get("result", {}).get("spamInfo", {})

    return {
        "success": True,
        "displayName": profile.get("displayName"),
        "displayNumber": profile.get("displayNumber"),
        "countryCode": profile.get("countryCode"),
        "tagCount": profile.get("tagCount"),
        "email": profile.get("email"),
        "spamType": spam.get("type"),
        "spamDegree": spam.get("degree"),
        "hasAccount": data.get("result", {}).get("hasAccount"),
        "raw": data
    }
