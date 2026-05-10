# Eye Tracking & Drowsiness Detection

A computer vision pipeline for real-time eye tracking and drowsiness detection using facial landmarks. Built with MediaPipe's Face Landmarker and OpenCV.

---

## Overview

This project processes video input (live webcam or recorded footage) to track eye regions, compute eye aspect ratios, and lay the groundwork for drowsiness/blink detection. The pipeline covers video preprocessing, facial landmark detection, eye region masking, and ratio-based eye state analysis.

---

## Project Structure

```
├── detection.py        # Eye region detection and masking using facial landmarks
├── ratios.py           # Eye Aspect Ratio (EAR) calculation for blink/drowsiness detection
├── preprocessing.py    # Video standardization, tensor loading, and augmentation
├── face_landmarker.task  # MediaPipe Face Landmarker model file
├── output/             # Processed video output
└── yashu.mp4           # Sample test video
```

---

## Modules

### `detection.py` — Eye Tracker

Detects and isolates eye regions from video frames using MediaPipe's 478-point facial landmark mesh.

- Uses 16 landmark points per eye to construct accurate eye polygons
- Masks out everything except the eye regions, returning a clean isolated view
- Runs in MediaPipe's VIDEO mode for efficient frame-by-frame processing
- Supports live webcam input out of the box

```python
from detection import EyeTracker

tracker = EyeTracker(model_path='face_landmarker.task')
processed_frame = tracker.process_frame(frame)
tracker.close()
```

Run directly for live webcam demo:
```bash
python detection.py
```
Press `ESC` to exit.

---

### `ratios.py` — Eye Aspect Ratio Calculator

Computes the Eye Aspect Ratio (EAR) for both eyes — the standard metric used in drowsiness and blink detection research.

**EAR = vertical distance / horizontal distance**

When the eye is open, EAR stays relatively constant. When the eye closes (blink or drowsiness), EAR drops sharply toward zero.

```python
from ratios import RatioCalculator

calculator = RatioCalculator(model_path='face_landmarker.task')
landmarks = calculator.get_landmarks(frame)

left_ear  = calculator.get_left_eye_ratio(landmarks)
right_ear = calculator.get_right_eye_ratio(landmarks)
```

---

### `preprocessing.py` — Video Preprocessing Pipeline

Handles all video preparation steps before feeding into the detection pipeline.

- **Metadata extraction** — validates and inspects video files
- **Standardization** — resizes to 224×224, enforces 30fps, h264 codec, RGB color space
- **Tensor loading** — loads 64 frames with stride 2 into CPU tensors
- **Augmentation** — supports crop, flip, brightness, contrast adjustments (individual and chained)

```python
from preprocessing import extract_metadata, standardize_video, load_tensors, augment_video

# Validate and inspect
info = extract_metadata("yashu.mp4")

# Standardize to consistent format
standardize_video(["yashu.mp4"], output_dir="output/")

# Load as tensor for model input
tensor = load_tensors("output/yashu.mp4")

# Apply augmentations
augmented = augment_video(tensor)
```

> Requires the `vid_prepper` package.

---

## Dependencies

- [MediaPipe](https://developers.google.com/mediapipe) — facial landmark detection
- [OpenCV](https://opencv.org/) — video capture and image processing
- [NumPy](https://numpy.org/) — numerical operations
- `vid_prepper` — video standardization and augmentation

Install core dependencies:
```bash
pip install mediapipe opencv-python numpy
```

---

## Landmark Reference

MediaPipe's Face Landmarker provides 478 facial landmarks. Key indices used in this project:

| Region | Landmarks Used |
|---|---|
| Left eye | 362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398 |
| Right eye | 33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246 |
| Left EAR points | 159 (upper), 145 (lower), 33 (outer), 133 (inner) |
| Right EAR points | 386 (upper), 374 (lower), 263 (outer), 362 (inner) |

---

## Status

Work in progress. Current implementation covers:

- [x] Facial landmark detection pipeline
- [x] Eye region isolation and masking
- [x] Eye Aspect Ratio computation
- [x] Video preprocessing and augmentation pipeline
- [ ] Blink detection logic
- [ ] Drowsiness classification model
- [ ] End-to-end inference pipeline
- [ ] Real-time alerting
