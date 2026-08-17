from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
import models, schemas, auth

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=schemas.StatsOut)
def get_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    projects = db.query(models.Project).filter(models.Project.owner_id == current_user.id).all()
    project_ids = [p.id for p in projects]
    tasks = db.query(models.Task).filter(models.Task.project_id.in_(project_ids)).all()

    completed = sum(1 for t in tasks if t.status == models.TaskStatus.completed)
    pending = sum(1 for t in tasks if t.status != models.TaskStatus.completed)

    return schemas.StatsOut(
        total_projects=len(projects),
        completed_tasks=completed,
        pending_tasks=pending,
        team_members=1,  # placeholder until a team/membership model exists
    )


@router.get("/charts", response_model=schemas.ChartDataOut)
def get_chart_data(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    projects = db.query(models.Project).filter(models.Project.owner_id == current_user.id).all()

    # Progress chart: each project's title -> progress %
    progress_labels = [p.title for p in projects]
    progress_values = [p.progress for p in projects]

    # Category chart: count of projects per category
    category_counts = Counter(p.category for p in projects)

    return schemas.ChartDataOut(
        progress_labels=progress_labels,
        progress_values=progress_values,
        category_labels=list(category_counts.keys()),
        category_values=list(category_counts.values()),
    )
