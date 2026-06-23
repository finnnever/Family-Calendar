import WebApp from "@twa-dev/sdk";

export function initTelegram() {
  try {
    WebApp.ready();
    WebApp.expand();
  } catch {
    // not running inside Telegram — dev mode
  }
}

export function getTelegramUser() {
  return WebApp.initDataUnsafe?.user ?? null;
}

export function getInitData(): string {
  return WebApp.initData || "";
}

export const tg = WebApp;
