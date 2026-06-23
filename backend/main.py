import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv

load_dotenv()

from database import engine, get_db, Base
import models
import crud
import schemas
from auth import get_current_user
from schemas import UserBase
from notify import notify_group

Base.metadata.create_all(bind=engine)

scheduler = AsyncIOScheduler()


async def send_reminders(hours: int):
    from telegram import Bot
    bot = Bot(token=os.getenv("TELEGRAM_BOT_TOKEN", ""))
    db = next(get_db())
    try:
        tasks = crud.get_tasks_needing_reminder(db, hours)
        for task in tasks:
            label = "24 часа" if hours == 24 else "1 час"
            assignee_name = task.assignee.first_name if task.assignee else "—"
            text = (
                f"⏰ <b>Напоминание</b>\n"
                f"Задача «{task.title}» должна быть выполнена через {label}!\n"
                f"Исполнитель: {assignee_name}"
            )
            try:
                await bot.send_message(chat_id=task.assignee_id, text=text, parse_mode="HTML")
                await notify_group(text)
                crud.mark_reminder_sent(db, task, hours)
            except Exception:
                pass
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(send_reminders, "interval", hours=1, args=[24], id="reminder_24h")
    scheduler.add_job(send_reminders, "interval", hours=1, args=[1], id="reminder_1h")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Family Calendar API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Users ---

@app.post("/users/me", response_model=schemas.UserOut)
def sync_user(
    current_user: UserBase = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.upsert_user(db, current_user)


@app.get("/users", response_model=list[schemas.UserOut])
def list_users(
    current_user: UserBase = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.get_users(db)


# --- Tasks ---

@app.get("/tasks", response_model=list[schemas.TaskOut])
def list_tasks(
    current_user: UserBase = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.get_tasks(db)


@app.post("/tasks", response_model=schemas.TaskOut)
async def create_task(
    task: schemas.TaskCreate,
    current_user: UserBase = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    crud.upsert_user(db, current_user)
    new_task = crud.create_task(db, task, current_user.telegram_id)
    deadline_str = new_task.deadline.strftime("%d.%m.%Y %H:%M") if new_task.deadline else "не указан"
    assignee_name = new_task.assignee.first_name if new_task.assignee else "—"
    await notify_group(
        f"📋 <b>Новая задача</b>\n"
        f"«{new_task.title}»\n"
        f"Исполнитель: {assignee_name}\n"
        f"Дедлайн: {deadline_str}"
    )
    return new_task


@app.patch("/tasks/{task_id}", response_model=schemas.TaskOut)
async def update_task(
    task_id: int,
    update: schemas.TaskUpdate,
    current_user: UserBase = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = crud.update_task(db, task_id, update)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    STATUS_LABELS = {"todo": "К выполнению", "in_progress": "В процессе", "done": "Готово"}
    if update.status == "done":
        await notify_group(
            f"✅ <b>Задача выполнена</b>\n"
            f"«{task.title}»\n"
            f"Выполнил: {current_user.first_name}"
        )
    elif update.status in ("todo", "in_progress"):
        await notify_group(
            f"🔄 <b>Статус изменён</b>\n"
            f"«{task.title}» → {STATUS_LABELS[update.status]}\n"
            f"Изменил: {current_user.first_name}"
        )
    elif update.status is None:
        deadline_str = task.deadline.strftime("%d.%m.%Y %H:%M") if task.deadline else "не указан"
        await notify_group(
            f"✏️ <b>Задача обновлена</b>\n"
            f"«{task.title}»\n"
            f"Дедлайн: {deadline_str}\n"
            f"Изменил: {current_user.first_name}"
        )
    return task


@app.delete("/tasks/{task_id}")
async def delete_task(
    task_id: int,
    current_user: UserBase = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = crud.get_task(db, task_id)
    if not task or not crud.delete_task(db, task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    await notify_group(
        f"🗑 <b>Задача удалена</b>\n"
        f"«{task.title}»\n"
        f"Удалил: {current_user.first_name}"
    )
    return {"ok": True}


# --- Comments ---

@app.post("/comments", response_model=schemas.CommentOut)
def create_comment(
    comment: schemas.CommentCreate,
    current_user: UserBase = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    crud.upsert_user(db, current_user)
    task = crud.get_task(db, comment.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return crud.create_comment(db, comment, current_user.telegram_id)


# --- Admin ---

@app.get("/admin/stats", response_model=schemas.AdminStats)
def admin_stats(
    current_user: UserBase = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    admin_id = int(os.getenv("ADMIN_TELEGRAM_ID", "0"))
    if current_user.telegram_id != admin_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return crud.get_admin_stats(db)
