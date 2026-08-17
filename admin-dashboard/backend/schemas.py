from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from models import TaskStatus, ProjectStatus


# ---------- Auth ----------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Tasks ----------
class TaskCreate(BaseModel):
    title: str
    status: TaskStatus = TaskStatus.pending
    priority: str = "medium"
    due_date: Optional[datetime] = None
    project_id: int


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskOut(BaseModel):
    id: int
    title: str
    status: TaskStatus
    priority: str
    due_date: Optional[datetime]
    project_id: int

    class Config:
        from_attributes = True


# ---------- Projects ----------
class ProjectCreate(BaseModel):
    title: str
    category: str
    icon: str = "folder"
    progress: int = 0
    status: ProjectStatus = ProjectStatus.in_progress
    due_date: Optional[datetime] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    progress: Optional[int] = None
    status: Optional[ProjectStatus] = None
    due_date: Optional[datetime] = None


class ProjectOut(BaseModel):
    id: int
    title: str
    category: str
    icon: str
    progress: int
    status: ProjectStatus
    due_date: Optional[datetime]
    tasks: list[TaskOut] = []

    class Config:
        from_attributes = True


# ---------- Stats ----------
class StatsOut(BaseModel):
    total_projects: int
    completed_tasks: int
    pending_tasks: int
    team_members: int


class ChartDataOut(BaseModel):
    progress_labels: list[str]
    progress_values: list[int]
    category_labels: list[str]
    category_values: list[int]
