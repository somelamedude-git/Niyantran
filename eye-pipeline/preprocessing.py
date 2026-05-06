from vid_prepper import metadata
from vid_prepper import standardize
from vid_prepper import loader

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

def load_tensors(video_path: str):
    video_loader = loader.VideoLoader(
        num_frames=64,
        frame_stride=2,
        device='cpu',
        use_nvdec=False
    )

    video_tensor = video_loader.load_file(video_path)
    return video_tensor
