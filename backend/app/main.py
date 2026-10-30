from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.clients.router import router as clients_router
from app.core.config import settings
from app.core.database import init_db
from app.goals.router import router as goals_router
from app.kanban.router import router as kanban_router
from app.study.router import router as study_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Monólito Modular: Kanban de Demandas Simuladas + Hub de Estudo Ativo com RAG In-Process",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(kanban_router, prefix="/api/v1")
app.include_router(clients_router, prefix="/api/v1")
app.include_router(study_router, prefix="/api/v1")
app.include_router(goals_router, prefix="/api/v1")


@app.get("/health", tags=["system"])
def health_check():
    return {
        "status": "ok",
        "service": settings.app_name,
        "architecture": "modular-monolith",
        "modules": ["core", "kanban", "clients/demands", "study/rag", "goals"],
    }
