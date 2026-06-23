import os
import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from dotenv import load_dotenv

load_dotenv()

WEBAPP_URL = os.getenv("WEBAPP_URL", "https://your-app.vercel.app")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton(
            "📅 Открыть календарь",
            web_app=WebAppInfo(url=WEBAPP_URL),
        )
    ]])
    await update.message.reply_text(
        "Привет! Нажми кнопку, чтобы открыть семейный календарь задач.",
        reply_markup=keyboard,
    )


def run_bot():
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start, filters=None))
    app.run_polling(allowed_updates=["message", "callback_query"])


if __name__ == "__main__":
    run_bot()
