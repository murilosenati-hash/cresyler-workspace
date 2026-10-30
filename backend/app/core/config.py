import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
LANCEDB_DIR = DATA_DIR / "lancedb"


class Settings(BaseModel):
    app_name: str = os.getenv("APP_NAME", "Cresyler Workspace & Study Hub")
    app_env: str = os.getenv("APP_ENV", "development")
    database_url: str = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'cresyler.db'}")
    lancedb_uri: str = os.getenv("LANCEDB_URI", str(LANCEDB_DIR))
    uploads_dir: str = os.getenv("UPLOADS_DIR", str(UPLOADS_DIR))
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]


settings = Settings()
