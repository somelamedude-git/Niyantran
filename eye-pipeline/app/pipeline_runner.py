import logging
import os

import numpy as np
import yaml
from fastapi import HTTPException

from app.schemas import AnalyzeResponse
from src.pipeline import DryEyePipeline
from src.model.lstm import LSTMWrapper

logger = logging.getLogger(__name__)


class PipelineRunner:
    def __init__(self, pipeline: DryEyePipeline) -> None:
        self._pipeline = pipeline

    @classmethod
    def from_config(
        cls,
        config_path: str,
        threshold_override: float | None = None,
    ) -> "PipelineRunner":
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Config file not found: {config_path}")

        with open(config_path, "r") as f:
            config = yaml.safe_load(f)

        face_landmarker_path: str = config["model"]["face_landmarker_path"]
        lstm_weights_path: str = config["model"]["lstm_weights_path"]
        threshold: float = config["inference"]["threshold"]
        device: str = config["inference"]["device"]
        max_imf: int = config["emd"]["max_imf"]
        data_processed: str = config["paths"]["data_processed"]

        if threshold_override is not None:
            threshold = threshold_override

        lstm_model: LSTMWrapper | None = None
        if os.path.exists(lstm_weights_path):
            lstm_model = LSTMWrapper(
                weights_path=lstm_weights_path,
                device=device,
            )
        else:
            logger.warning(
                "LSTM weights file not found at '%s'. "
                "Dry-eye probability will not be computed.",
                lstm_weights_path,
            )

        pipeline = DryEyePipeline(
            face_landmarker_path=face_landmarker_path,
            processed_dir=data_processed,
            lstm_wrapper=lstm_model,
            threshold=threshold,
        )

        return cls(pipeline)

    def run(self, video_path: str) -> AnalyzeResponse:
        try:
            result = self._pipeline.run(video_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

        if len(result["left_ear_sequence"]) == 0:
            raise HTTPException(
                status_code=422,
                detail="No face landmarks detected in the video.",
            )

        return AnalyzeResponse(
            probability=result["dry_eye_prob"],
            has_dry_eye=result["has_dry_eye"],
            mean_ear_left=float(np.mean(result["left_ear_sequence"])),
            mean_ear_right=float(np.mean(result["right_ear_sequence"])),
        )

    def close(self) -> None:
        if hasattr(self._pipeline, "close") and callable(self._pipeline.close):
            self._pipeline.close()
