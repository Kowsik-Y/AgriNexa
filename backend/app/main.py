from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.db.init_db import init_db
from app.db.session import close_db

setup_logging()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    try:
        from app.services.ml_models import preload_models
        preload_models()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Model preloading skipped or failed: {e}")
    yield
    await close_db()

app = FastAPI(
    title="AgriNexa API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    openapi_url="/api/v1/openapi.json",
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    errors = exc.errors()
    for error in errors:
        if "ctx" in error:
            error.pop("ctx")
    return JSONResponse(status_code=422, content=jsonable_encoder({"detail": errors}))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
