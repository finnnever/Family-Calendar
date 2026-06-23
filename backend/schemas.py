from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from models import Priority, Status


class UserBase(BaseModel):
    telegram_id: int
    first_name: str
    username: Optional[str] = None


class UserOut(UserBase):
    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    text: str
    task_id: int


class CommentOut(BaseModel):
    id: int
    text: str
    created_at: datetime
    user_id: int
    task_id: int
    author: UserOut

    class Config:
        from_attributes = True


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Priority = Priority.medium
    assignee_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[Priority] = None
    status: Optional[Status] = None
    assignee_id: Optional[int] = None


class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    deadline: Optional[datetime]
    priority: Priority
    status: Status
    created_at: datetime
    created_by: int
    assignee_id: Optional[int]
    creator: UserOut
    assignee: Optional[UserOut]
    comments: list[CommentOut] = []

    class Config:
        from_attributes = True


class UserStats(BaseModel):
    user: UserOut
    created: int
    completed: int
    on_time: int
    overdue: int


class AdminStats(BaseModel):
    users: list[UserStats]
    total_tasks: int
    completed_tasks: int
    on_time_rate: float
