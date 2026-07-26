"""Application configuration loaded from environment variables."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


# Resolve paths relative to this file's parent (backend/) so the DB
# always lands at backend/signal.db regardless of which directory
# uvicorn is launched from.
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings — values come from .env or environment."""

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
    )

    SECRET_KEY: str = "change-me-in-production"
    TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'signal.db'}"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def allowed_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        if origins:
            return origins
        return [self.FRONTEND_URL]

    @property
    def is_production(self) -> bool:
        """True when FRONTEND_URL is HTTPS (i.e. deployed, not localhost)."""
        return self.FRONTEND_URL.startswith("https://")


settings = Settings()
