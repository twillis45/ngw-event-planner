"""NGW Events API — FastAPI entrypoint.
Run locally:  uvicorn app.main:app --reload --port 8000
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import ALLOWED_ORIGINS
from .db import close_pool
from .routers import communication

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="NGW Events API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
)

@app.get("/health")
async def health():
    return {"ok": True, "service": "ngw-events-api"}

@app.on_event("shutdown")
async def _shutdown():
    await close_pool()

app.include_router(communication.router)
