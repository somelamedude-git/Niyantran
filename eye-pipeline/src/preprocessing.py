from vid_prepper import metadata
from vid_prepper import standardize
from vid_prepper import loader
from vid_prepper import augmentor

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

def augment_video(video_tensor):
    video_augmentor = augmentor.VideoAugmentor(
        device="cpu",
        use_gpu=False
    )

    cropped = augmentor.crop(video_tensor, type="center", size=(200, 200))
    flipped = augmentor.flip(video_tensor, type="horizontal")
    brightened = augmentor.brightness(video_tensor, amount=0.2)

    augmentations = [
            ('crop', {'type': 'random', 'size': (180, 180)}),
            ('flip', {'type': 'horizontal'}),
            ('brightness', {'amount': 0.1}),
            ('contrast', {'amount': 0.1})
        ]
    chained_result = augmentor.chain(video_tensor, augmentations)
    return chained_result
