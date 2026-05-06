from vid_prepper import metadata

def extract_metadata(video_path):
    video_info = metadata.Metadata.validate_videos([video_path])[0]
    return video_info

print(extract_metadata('yashu.mp4'))