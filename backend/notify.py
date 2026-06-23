import os
from telegram import Bot

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
GROUP_CHAT_ID = os.getenv("GROUP_CHAT_ID", "")


async def notify_group(text: str):
    if not GROUP_CHAT_ID:
        return
    try:
        bot = Bot(token=BOT_TOKEN)
        await bot.send_message(chat_id=int(GROUP_CHAT_ID), text=text, parse_mode="HTML")
    except Exception:
        pass
