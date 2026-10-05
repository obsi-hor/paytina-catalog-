import os
import asyncio
from datetime import datetime, timedelta
from flask import Flask, request
from aiogram import Bot, Dispatcher, types
from aiogram.types import Update, LabeledPrice, PreCheckoutQuery
from aiogram.filters import Command

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBHOOK_URL = os.getenv("WEBHOOK_URL")
CHANNEL_ID = "@kmdetei"

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
app = Flask(__name__)

# ---------- ТАРИФЫ ----------
PLANS = {
    "1d":      {"title": "1 день",   "price": 15,  "days": 1},
    "3d":      {"title": "3 дня",    "price": 25,  "days": 3},
    "7d":      {"title": "7 дней",   "price": 50,  "days": 7},
    "30d":     {"title": "30 дней",  "price": 100, "days": 30},
    "forever": {"title": "Навсегда", "price": 200, "days": 99999},
}

# ---------- ПРОМОКОДЫ ----------
PROMOCODES = {
    "PAYTINA10": 10,
    "START20":   20,
    "KMDE5":     5,
}

# ---------- ХРАНИЛИЩЕ ----------
USERS = {}
PENDING_PROMO = {}

# ---------- ПОДПИСКА НА КАНАЛ ----------
async def is_subscribed(bot: Bot, user_id: int) -> bool:
    try:
        member = await bot.get_chat_member(chat_id=CHANNEL_ID, user_id=user_id)
        return member.status in ("member", "administrator", "creator")
    except Exception:
        return False

# ---------- КЛАВИАТУРЫ ----------
def subscribe_keyboard():
    return types.InlineKeyboardMarkup(inline_keyboard=[
        [types.InlineKeyboardButton(text="📢 Подписаться", url="https://t.me/kmdetei")],
        [types.InlineKeyboardButton(text="✅ Я подписался", callback_data="check_sub")],
    ])

def main_keyboard():
    return types.InlineKeyboardMarkup(inline_keyboard=[
        [types.InlineKeyboardButton(text="💎 Купить подписку", callback_data="show_plans")],
        [types.InlineKeyboardButton(text="🎟 Ввести промокод", callback_data="enter_promo")],
        [types.InlineKeyboardButton(text="👤 Мой профиль", callback_data="profile")],
    ])

def plans_keyboard():
    return types.InlineKeyboardMarkup(inline_keyboard=[
        [types.InlineKeyboardButton(text="1 день — 15 ⭐",   callback_data="buy_1d")],
        [types.InlineKeyboardButton(text="3 дня — 25 ⭐",    callback_data="buy_3d")],
        [types.InlineKeyboardButton(text="7 дней — 50 ⭐",   callback_data="buy_7d")],
        [types.InlineKeyboardButton(text="30 дней — 100 ⭐", callback_data="buy_30d")],
        [types.InlineKeyboardButton(text="Навсегда — 200 ⭐", callback_data="buy_forever")],
        [types.InlineKeyboardButton(text="⬅ Назад", callback_data="back_main")],
    ])

def back_keyboard():
    return types.InlineKeyboardMarkup(inline_keyboard=[
        [types.InlineKeyboardButton(text="⬅ Назад", callback_data="back_main")],
    ])

# ---------- УТИЛИТЫ ----------
def get_user(user_id: int) -> dict:
    if user_id not in USERS:
        USERS[user_id] = {"sub_until": None, "promo": None}
    return USERS[user_id]

def calc_price(base_price: int, discount: int) -> int:
    if discount <= 0:
        return base_price
    return max(int(base_price * (100 - discount) / 100), 1)

def format_sub(user: dict) -> str:
    if not user["sub_until"]:
        return "нет"
    now = datetime.now()
    if user["sub_until"] < now:
        return "истекла"
    if user["sub_until"].year >= 9999:
        return "навсегда"
    return user["sub_until"].strftime("%d.%m.%Y %H:%M")

# ---------- /start ----------
@dp.message(Command("start"))
async def start(message: types.Message):
    if not await is_subscribed(message.bot, message.from_user.id):
        await message.answer(
            "🔒 Для доступа к боту подпишись на канал:",
            reply_markup=subscribe_keyboard()
        )
        return

    get_user(message.from_user.id)
    args = message.text.split()
    if len(args) > 1 and args[1] in PLANS:
        await send_invoice(message, args[1])
    else:
        await message.answer(
            "💎 Добро пожаловать в paytina-catalog!\n\n"
            "Здесь ты можешь оформить подписку на сервис.",
            reply_markup=main_keyboard()
        )

# ---------- ПРОВЕРКА ПОДПИСКИ ----------
@dp.callback_query(lambda c: c.data == "check_sub")
async def check_sub(callback: types.CallbackQuery):
    if await is_subscribed(callback.bot, callback.from_user.id):
        get_user(callback.from_user.id)
        await callback.message.edit_text(
            "✅ Подписка подтверждена!\n\nВыбери действие:",
            reply_markup=main_keyboard()
        )
    else:
        await callback.answer("❌ Ты ещё не подписался.", show_alert=True)

# ---------- ГЛАВНОЕ МЕНЮ ----------
@dp.callback_query(lambda c: c.data == "back_main")
async def back_main(callback: types.CallbackQuery):
    await callback.message.edit_text("Главное меню:", reply_markup=main_keyboard())

@dp.callback_query(lambda c: c.data == "show_plans")
async def show_plans(callback: types.CallbackQuery):
    user = get_user(callback.from_user.id)
    discount = PROMOCODES.get(user["promo"], 0) if user["promo"] else 0
    text = "💎 Выбери тариф:\n"
    if discount:
        text += f"\n🎟 Промокод активен: скидка {discount}%"
    else:
        text += "\n🎟 Промокод не активирован"
    await callback.message.edit_text(text, reply_markup=plans_keyboard())

# ---------- ПРОФИЛЬ ----------
@dp.callback_query(lambda c: c.data == "profile")
async def profile(callback: types.CallbackQuery):
    user = get_user(callback.from_user.id)
    promo = user["promo"] or "—"
    text = (
        f"👤 Профиль\n\n"
        f"ID: {callback.from_user.id}\n"
        f"Имя: {callback.from_user.first_name or '—'}\n"
        f"Подписка: {format_sub(user)}\n"
        f"Промокод: {promo}"
    )
    await callback.message.edit_text(text, reply_markup=back_keyboard())

# ---------- ПРОМОКОД ----------
@dp.callback_query(lambda c: c.data == "enter_promo")
async def enter_promo(callback: types.CallbackQuery):
    PENDING_PROMO[callback.from_user.id] = True
    await callback.message.edit_text(
        "🎟 Введи промокод сообщением:",
        reply_markup=back_keyboard()
    )
    await callback.answer()

@dp.message(lambda m: m.from_user.id in PENDING_PROMO)
async def apply_promo(message: types.Message):
    code = message.text.strip().upper()
    PENDING_PROMO.pop(message.from_user.id, None)
    user = get_user(message.from_user.id)
    if code in PROMOCODES:
        user["promo"] = code
        await message.answer(
            f"✅ Промокод активирован! Скидка: {PROMOCODES[code]}%",
            reply_markup=main_keyboard()
        )
    else:
        await message.answer("❌ Такого промокода нет.", reply_markup=main_keyboard())

# ---------- ПОКУПКА ----------
@dp.callback_query(lambda c: c.data.startswith("buy_"))
async def buy_callback(callback: types.CallbackQuery):
    if not await is_subscribed(callback.bot, callback.from_user.id):
        await callback.message.edit_text(
            "🔒 Сначала подпишись на канал:",
            reply_markup=subscribe_keyboard()
        )
        return
    plan_id = callback.data.replace("buy_", "")
    await send_invoice(callback.message, plan_id)
    await callback.answer()

async def send_invoice(message: types.Message, plan_id: str):
    plan = PLANS[plan_id]
    user_id = message.chat.id
    user = get_user(user_id)
    discount = PROMOCODES.get(user["promo"], 0) if user["promo"] else 0
    final_price = calc_price(plan["price"], discount)
    description = f"Подписка paytina-catalog — {plan['title']}"
    if discount:
        description += f" (скидка {discount}%)"
    await message.answer_invoice(
        title=plan["title"],
        description=description,
        payload=f"sub_{plan_id}",
        currency="XTR",
        prices=[LabeledPrice(label=plan["title"], amount=final_price)],
        provider_token=""
    )

# ---------- ОПЛАТА ----------
@dp.pre_checkout_query()
async def pre_checkout(query: PreCheckoutQuery):
    await query.answer(ok=True)

@dp.message(lambda m: m.successful_payment)
async def successful_payment(message: types.Message):
    payment = message.successful_payment
    plan_id = payment.invoice_payload.replace("sub_", "")
    plan = PLANS.get(plan_id, {"title": "?", "days": 0})

    user = get_user(message.from_user.id)
    now = datetime.now()
    if plan["days"] >= 99999:
        user["sub_until"] = datetime(9999, 12, 31)
    else:
        base = user["sub_until"] if user["sub_until"] and user["sub_until"] > now else now
        user["sub_until"] = base + timedelta(days=plan["days"])

    await message.answer(
        f"✅ Оплата прошла!\n\n"
        f"Тариф: {plan['title']}\n"
        f"Сумма: {payment.total_amount} ⭐\n"
        f"Подписка активна до: {format_sub(user)}\n\n"
        f"Спасибо!",
        reply_markup=main_keyboard()
    )

# ---------- WEBHOOK ----------
@app.route("/webhook", methods=["POST"])
def webhook():
    try:
        data = request.get_json(force=True)
        update = Update.model_validate(data, context={"bot": bot})
        asyncio.run(dp.feed_update(bot, update))
    except Exception as e:
        print(f"Webhook error: {e}")
    return "OK"

@app.route("/", methods=["GET"])
def index():
    return "Bot is running"

@app.route("/health", methods=["GET"])
def health():
    return "OK"

async def set_webhook():
    await bot.set_webhook(f"{WEBHOOK_URL}/webhook")
    print(f"Webhook set: {WEBHOOK_URL}/webhook")

if __name__ == "__main__":
    if WEBHOOK_URL:
        asyncio.run(set_webhook())
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
