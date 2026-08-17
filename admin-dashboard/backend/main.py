from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import auth_router, projects_router, tasks_router, stats_router

# Creates dashboard.db and all tables on first run (no-op if they already exist)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Dashboard API")

# Allow your frontend (served from file:// or a local dev server) to call this API.
# Tighten this to your real domain before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(projects_router.router)
app.include_router(tasks_router.router)
app.include_router(stats_router.router)


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}
