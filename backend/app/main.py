"""FastAPI application entry point with lifespan, CORS, and global error handling."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import Base, engine
from app.routers import auth, contacts, conversations, messages, users, websocket

# Import all models so Base.metadata knows about every table
import app.models  # noqa: F401

logger = logging.getLogger("signal-clone")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup (replaces deprecated on_event)."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully.")
    yield


app = FastAPI(
    title="Signal Clone API",
    description="Backend API for Signal Messenger Clone",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — must allow credentials and specify exact origin (not "*")
# for httpOnly cookies to work across localhost:3000 → localhost:8000.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global exception handlers — consistent {"detail": "..."} shape
# ---------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return 422 with human-readable field-level errors."""
    errors = []
    for error in exc.errors():
        field = " → ".join(str(loc) for loc in error["loc"])
        errors.append(f"{field}: {error['msg']}")
    return JSONResponse(
        status_code=422,
        content={"detail": "; ".join(errors)},
    )


@app.exception_handler(Exception)
async def global_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Catch-all — log the real error, return a safe message."""
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Include routers
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(contacts.router)
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(users.router)
app.include_router(websocket.router)
