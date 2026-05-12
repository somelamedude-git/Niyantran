# Dry Eye Detection

A computer vision pipeline for dry eye detection using facial landmarks, Eye Aspect Ratio (EAR), Empirical Mode Decomposition (EMD), and an LSTM classifier. Built with MediaPipe and OpenCV.

---

## Pipeline

```
Raw video
   │
   ▼
Preprocessing (standardize to 224×224, 30fps, RGB)
   │
   ▼
Frame-by-frame landmark detection (MediaPipe FaceLandmarker)
   │
   ▼
Eye Aspect Ratio (EAR) per frame → EAR time series
   │
   ▼
Empirical Mode Decomposition (EMD) → IMF feature matrix (n_frames × 5)
   │
   ▼
LSTM classifier → dry eye probability → NORMAL / DRY EYE DETECTED
```

---

## Project Structure

```
├── src/
│   ├── detection.py        # Eye region masking via facial landmarks
│   ├── ratios.py           # EAR computation + EMD decomposition
│   ├── preprocessing.py    # Video standardization, tensor loading, augmentation
│   ├── pipeline.py         # Orchestrates the full pipeline end-to-end
│   ├── inference.py        # CLI entry point for running inference
│   └── model/
│       └── lstm.py         # LSTM model definition + loader wrapper
│
├── config/
│   └── config.yaml         # All tunable parameters
│
├── models/                 # Drop trained LSTM weights here (.pt)
├── data/
│   ├── raw/                # Input videos go here
│   └── processed/          # Standardized videos written here
├── output/                 # Masked frame outputs
├── face_landmarker.task    # MediaPipe Face Landmarker model
└── requirements.txt
```

---

## Quickstart

### Install dependencies
```bash
pip install -r requirements.txt
```

### Run inference on a video
```bash
# Feature extraction only (no LSTM weights needed)
python -m src.inference --video data/raw/sample.mp4

# Full inference with LSTM
python -m src.inference --video data/raw/sample.mp4 --model models/lstm.pt

# Save IMF features for training
python -m src.inference --video data/raw/sample.mp4 --save-features output/features.npy
```

### Run eye masking on a video
```bash
python src/detection.py data/raw/sample.mp4
```

---

## Modules

### `src/detection.py` — Eye Tracker
Detects and isolates eye regions from video frames using MediaPipe's 478-point facial landmark mesh. Uses 16 landmark points per eye to construct accurate eye polygons and masks out everything else.

### `src/ratios.py` — Ratio Calculator
Computes the **Eye Aspect Ratio (EAR)** for both eyes — the standard metric for blink detection. Also runs **Empirical Mode Decomposition (EMD)** on a sequence of EAR values to extract IMF features for the LSTM.

**EAR = vertical distance / horizontal distance**

In dry eye conditions, blink rate and completeness change measurably — EAR over time captures this signal.

### `src/preprocessing.py` — Video Preprocessor
Handles all video preparation before detection:
- Metadata extraction and validation
- Standardization to 224×224, 30fps, h264, RGB
- Tensor loading (64 frames, stride 2)
- Augmentation (crop, flip, brightness, contrast)

### `src/pipeline.py` — Pipeline Orchestrator
Wires all components together. Takes a raw video path, runs the full stack, and returns EAR sequence, IMF features, and dry eye classification.

### `src/inference.py` — CLI Entry Point
Loads config, optionally loads LSTM weights, runs the pipeline, and prints results. Supports saving IMF features as `.npy` for training.

### `src/model/lstm.py` — LSTM Model
Placeholder LSTM architecture ready for your weights. Drop your trained `.pt` file into `models/` and update `config/config.yaml`.

---

## Configuration

All parameters are in `config/config.yaml`:

```yaml
model:
  face_landmarker_path: "face_landmarker.task"
  lstm_weights_path: "models/lstm.pt"

preprocessing:
  size: "224x224"
  fps: 30

emd:
  max_imf: 4

inference:
  device: "cpu"
  threshold: 0.5
```

---

## Landmark Reference

| Region | Landmarks Used |
|---|---|
| Left eye mask | 362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398 |
| Right eye mask | 33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246 |
| Left EAR points | 159 (upper), 145 (lower), 33 (outer), 133 (inner) |
| Right EAR points | 386 (upper), 374 (lower), 263 (outer), 362 (inner) |

---

## Dependencies

- [MediaPipe](https://developers.google.com/mediapipe) — facial landmark detection
- [OpenCV](https://opencv.org/) — video I/O and image processing
- [NumPy](https://numpy.org/) — numerical operations
- [PyEMD](https://pyemd.readthedocs.io/) — Empirical Mode Decomposition
- [PyTorch](https://pytorch.org/) — LSTM model
- `vid_prepper` — video standardization and augmentation

---

## Status

- [x] Facial landmark detection pipeline
- [x] Eye region isolation and masking
- [x] Eye Aspect Ratio (EAR) computation
- [x] EMD-based feature extraction
- [x] Video preprocessing and augmentation pipeline
- [x] End-to-end pipeline wiring
- [x] CLI inference entry point
- [x] LSTM model scaffold
- [ ] LSTM training
- [ ] Dry eye classification evaluation
