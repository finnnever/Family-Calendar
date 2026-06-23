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
  // Try SDK first, fall back to raw window object
  if (WebApp.initData) return WebApp.initData;
  const w = window as any;
  return w?.Telegram?.WebApp?.initData || "";
}

export const tg = WebApp;
