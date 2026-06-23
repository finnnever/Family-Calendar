import hashlib
import hmac
import json
import os
from urllib.parse import unquote, parse_qsl
from fastapi import HTTPException, Header
from schemas import UserBase


def validate_init_data(init_data: str, bot_token: str) -> dict:
    """Validate Telegram WebApp initData using HMAC-SHA256."""
    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    check_hash = parsed.pop("hash", None)
    if not check_hash:
        raise HTTPException(status_code=401, detail="Missing hash")

    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(parsed.items())
    )
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed, check_hash):
        raise HTTPException(status_code=401, detail="Invalid initData")

    user_str = parsed.get("user", "{}")
    return json.loads(unquote(user_str))


def get_current_user(x_init_data: str = Header(...)) -> UserBase:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not token:
        raise HTTPException(status_code=500, detail="Bot token not configured")
    user_data = validate_init_data(x_init_data, token)
    return UserBase(
        telegram_id=user_data["id"],
        first_name=user_data.get("first_name", ""),
        username=user_data.get("username"),
    )
