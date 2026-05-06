from vid_prepper import metadata
from vid_prepper import standardize


def extract_metadata(video_path):
    video_info = metadata.Metadata.validate_videos([video_path])[0]
    return video_info



def standardize_video(video_path: list[str], output_dir: str):
    standardizer = standardize.VideoStandardizer(
        size="224x224",
        fps=30,
        codec='h264',
        color='rgb',
        use_gpu=False
    )

    standardizer.batch_standardize(videos=video_path, output_dir=output_dir)
