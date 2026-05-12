import cv2
import time
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


class EyeTracker:
    def __init__(self, model_path='face_landmarker.task'):
        BaseOptions = mp.tasks.BaseOptions
        FaceLandmarker = mp.tasks.vision.FaceLandmarker
        FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
        VisionRunningMode = mp.tasks.vision.RunningMode

        self.LEFT_EYE_INDICES = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
        self.RIGHT_EYE_INDICES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]

        self.options = FaceLandmarkerOptions(
            base_options = BaseOptions(model_asset_path=model_path),
            running_mode = VisionRunningMode.VIDEO
        )

        self.detector = FaceLandmarker.create_from_options(self.options)

    def _get_pixel_points(self, landmarks, indices, w, h):
        return np.array([
            [int(landmarks[idx].x * w), int(landmarks[idx].y * h)]
            for idx in indices
        ], dtype=np.int32)

    def mask_eyes(self, frame, left_eye_pts, right_eye_pts, h, w):
        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.fillPoly(mask, [left_eye_pts], 255)
        cv2.fillPoly(mask, [right_eye_pts], 255)
        masked_frame = cv2.bitwise_and(frame, frame, mask=mask)
        return masked_frame

    def process_frame(self, frame):
        h, w, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        result = self.detector.detect_for_video(mp_image, int(time.time()*1000))

        output_frame = np.zeros_like(frame)

        if result.face_landmarks:
            for face_landmarks in result.face_landmarks:
                left_eye_pts = self._get_pixel_points(face_landmarks, self.LEFT_EYE_INDICES, w, h)
                right_eye_pts = self._get_pixel_points(face_landmarks, self.RIGHT_EYE_INDICES, w, h)
                output_frame = self.mask_eyes(frame, left_eye_pts, right_eye_pts, h, w)

        return output_frame

    def close(self):
        self.detector.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("video_path", type=str)
    parser.add_argument("--model", type=str, default="face_landmarker.task")
    args = parser.parse_args()

    tracker = EyeTracker(model_path=args.model)
    cap = cv2.VideoCapture(args.video_path)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        processed_frame = tracker.process_frame(frame)
        cv2.imshow('Eye Tracker - Masked Mode', processed_frame)

        if cv2.waitKey(5) & 0xFF == 27:
            break

    tracker.close()
    cap.release()
    cv2.destroyAllWindows()
