# HLS streaming

## Flow

1. Creator uploads source video → API stores raw file in S3 (`uploads/{id}/source.mp4`).
2. Transcode worker runs FFmpeg → produces multi-bitrate HLS under `vod/{id}/`.
3. API saves manifest URL (`master.m3u8`) on the `Video` record.
4. Player requests `CDN_BASE_URL/vod/{id}/master.m3u8` and adaptive segments.

## Master playlist example

```
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720
720p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p/index.m3u8
```

## Player integration (web)

Use `hls.js` for browsers without native HLS, or `<video src="...m3u8">` on Safari.

DRM: append `#EXT-X-KEY` tags or use EME with your license server URL from `DRM_LICENSE_URL`.

## Live vs VOD

- **VOD**: Full file transcode, long TTL on CDN.
- **Live**: Rolling window playlists (`#EXT-X-TARGETDURATION`), shorter segment TTL, origin pull from ingest.
