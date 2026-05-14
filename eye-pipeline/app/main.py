import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from app.pipeline_runner import PipelineRunner
from app.routers.analyze import router as analyze_router


def _load_env() -> tuple[str, float | None]:
    config_path: str = os.environ.get("CONFIG_PATH", "config/config.yaml")

    threshold_override: float | None = None
    raw_threshold = os.environ.get("PIPELINE_THRESHOLD")
    if raw_threshold is not None:
        try:
            threshold_override = float(raw_threshold)
        except ValueError:
            raise ValueError(
                f"PIPELINE_THRESHOLD must be a valid float, got: {raw_threshold!r}"
            )

    return config_path, threshold_override


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    config_path, threshold_override = _load_env()
    app.state.runner = PipelineRunner.from_config(config_path, threshold_override)
    try:
        yield
    finally:
        app.state.runner.close()


app = FastAPI(
    title="Eye Pipeline Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(analyze_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
