import argparse
import os
import yaml
import numpy as np

from src.pipeline import DryEyePipeline


def load_config(config_path: str) -> dict:
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=str, required=True)
    parser.add_argument("--model", type=str, default=None)
    parser.add_argument("--config", type=str, default="config/config.yaml")
    parser.add_argument("--threshold", type=float, default=None)
    parser.add_argument("--save-features", type=str, default=None)
    args = parser.parse_args()

    config = load_config(args.config)

    face_landmarker_path = config["model"]["face_landmarker_path"]
    lstm_weights_path = args.model or config["model"]["lstm_weights_path"]
    processed_dir = config["paths"]["data_processed"]
    threshold = args.threshold or config["inference"]["threshold"]
    device = config["inference"]["device"]

    lstm_wrapper = None
    if os.path.exists(lstm_weights_path):
        from src.model.lstm import LSTMWrapper
        lstm_wrapper = LSTMWrapper(
            weights_path=lstm_weights_path,
            input_size=(config["emd"]["max_imf"] + 1) * 2,
            device=device
        )

    pipeline = DryEyePipeline(
        face_landmarker_path=face_landmarker_path,
        processed_dir=processed_dir,
        lstm_wrapper=lstm_wrapper,
        threshold=threshold,
    )

    try:
        results = pipeline.run(args.video)
    finally:
        pipeline.close()

    print(f"Frames processed : {len(results['left_ear_sequence'])}")
    if results["left_ear_sequence"]:
        print(f"Mean EAR (left)  : {np.mean(results['left_ear_sequence']):.4f}")
        print(f"Mean EAR (right) : {np.mean(results['right_ear_sequence']):.4f}")

    if results["dry_eye_prob"] is not None:
        print(f"Dry eye prob     : {results['dry_eye_prob']:.4f}")
        print(f"Classification   : {'DRY EYE DETECTED' if results['has_dry_eye'] else 'NORMAL'}")

    if args.save_features and results["imf_features"] is not None:
        np.save(args.save_features, results["imf_features"])


if __name__ == "__main__":
    main()
