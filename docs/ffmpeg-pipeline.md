# FFmpeg processing

## VOD ladder (ABR)

The worker in `workers/transcode` generates 360p / 720p / 1080p renditions and a master playlist.

Typical command pattern per rendition:

```bash
ffmpeg -i source.mp4 \
  -vf "scale=-2:720" -c:v libx264 -preset fast -crf 22 \
  -c:a aac -b:a 128k \
  -hls_time 6 -hls_playlist_type vod \
  -hls_segment_filename "720p/seg_%03d.ts" \
  720p/index.m3u8
```

## Requirements

- FFmpeg 5+ with `libx264` and `aac`
- Sufficient disk for intermediate files before S3 upload
- For production: GPU encoding (NVENC) or cloud transcoding (MediaConvert, Mux, etc.)

## Job queue

API enqueues `transcode` jobs on Redis (BullMQ). Worker polls, runs FFmpeg, uploads `*.m3u8` and `*.ts` to S3, then PATCHes video status via internal API.
