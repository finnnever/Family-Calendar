from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from models import Task, Comment, User, Status
from schemas import TaskCreate, TaskUpdate, CommentCreate, UserBase


def upsert_user(db: Session, user: UserBase) -> User:
    db_user = db.query(User).filter(User.telegram_id == user.telegram_id).first()
    if db_user:
        db_user.first_name = user.first_name
        db_user.username = user.username
    else:
        db_user = User(**user.model_dump())
        db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_users(db: Session) -> list[User]:
    return db.query(User).all()


def get_tasks(db: Session) -> list[Task]:
    return db.query(Task).all()


def get_task(db: Session, task_id: int) -> Task | None:
    return db.query(Task).filter(Task.id == task_id).first()


def create_task(db: Session, task: TaskCreate, created_by: int) -> Task:
    db_task = Task(**task.model_dump(), created_by=created_by)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def update_task(db: Session, task_id: int, update: TaskUpdate) -> Task | None:
    db_task = get_task(db, task_id)
    if not db_task:
        return None
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(db_task, field, value)
    db.commit()
    db.refresh(db_task)
    return db_task


def delete_task(db: Session, task_id: int) -> bool:
    db_task = get_task(db, task_id)
    if not db_task:
        return False
    db.delete(db_task)
    db.commit()
    return True


def create_comment(db: Session, comment: CommentCreate, user_id: int) -> Comment:
    db_comment = Comment(text=comment.text, task_id=comment.task_id, user_id=user_id)
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment


def get_admin_stats(db: Session) -> dict:
    users = db.query(User).all()
    total_tasks = db.query(Task).count()
    completed_tasks = db.query(Task).filter(Task.status == Status.done).count()

    user_stats = []
    for user in users:
        created = db.query(Task).filter(Task.created_by == user.telegram_id).count()
        completed = db.query(Task).filter(
            Task.assignee_id == user.telegram_id,
            Task.status == Status.done
        ).count()
        on_time = db.query(Task).filter(
            Task.assignee_id == user.telegram_id,
            Task.status == Status.done,
            Task.deadline.isnot(None),
            Task.deadline >= func.datetime('now')
        ).count()
        overdue = db.query(Task).filter(
            Task.assignee_id == user.telegram_id,
            Task.status != Status.done,
            Task.deadline.isnot(None),
            Task.deadline < func.datetime('now')
        ).count()
        user_stats.append({
            "user": user,
            "created": created,
            "completed": completed,
            "on_time": on_time,
            "overdue": overdue,
        })

    on_time_rate = 0.0
    if completed_tasks > 0:
        all_on_time = db.query(Task).filter(
            Task.status == Status.done,
            Task.deadline.isnot(None),
        ).count()
        on_time_rate = round(all_on_time / completed_tasks * 100, 1)

    return {
        "users": user_stats,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "on_time_rate": on_time_rate,
    }


def get_tasks_needing_reminder(db: Session, hours: int) -> list[Task]:
    from datetime import timedelta
    now = datetime.utcnow()
    window_start = now + timedelta(hours=hours - 0.5)
    window_end = now + timedelta(hours=hours + 0.5)
    field = Task.reminder_24h_sent if hours == 24 else Task.reminder_1h_sent
    return db.query(Task).filter(
        Task.deadline >= window_start,
        Task.deadline <= window_end,
        Task.status != Status.done,
        Task.assignee_id.isnot(None),
        field == 0,
    ).all()


def mark_reminder_sent(db: Session, task: Task, hours: int):
    if hours == 24:
        task.reminder_24h_sent = 1
    else:
        task.reminder_1h_sent = 1
    db.commit()
