from pydantic import BaseModel


class AnalyzeResponse(BaseModel):
    probability: float | None
    has_dry_eye: bool | None
    mean_ear_left: float
    mean_ear_right: float


class ErrorResponse(BaseModel):
    error: str
