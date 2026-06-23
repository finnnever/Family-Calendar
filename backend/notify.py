import os
import logging
from telegram import Bot

logger = logging.getLogger("notify")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
GROUP_CHAT_ID = os.getenv("GROUP_CHAT_ID", "")


async def notify_group(text: str):
    logger.warning(f"[NOTIFY] chat={GROUP_CHAT_ID!r} token_len={len(BOT_TOKEN)} text={text[:40]!r}")
    if not GROUP_CHAT_ID:
        logger.warning("[NOTIFY] GROUP_CHAT_ID is empty, skipping")
        return
    try:
        bot = Bot(token=BOT_TOKEN)
        await bot.send_message(chat_id=int(GROUP_CHAT_ID), text=text, parse_mode="HTML")
        logger.warning("[NOTIFY] sent OK")
    except Exception as e:
        logger.warning(f"[NOTIFY] error: {e}")
