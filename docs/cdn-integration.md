# CDN integration

## Origin

Object storage (MinIO locally, S3 in production) holds:

- `uploads/` — raw uploads
- `vod/{videoId}/` — HLS segments and playlists
- `live/{channelId}/` — live HLS output

## Edge configuration

1. Create a CDN distribution (CloudFront, Cloudflare, Fastly).
2. Origin: S3 bucket or custom origin pointing to MinIO.
3. Cache behaviors:
   - `*.ts` — cache 1d–7d (immutable segment names)
   - `*.m3u8` — short TTL (5–30s) for live; longer for VOD if static
4. Set `CDN_BASE_URL` in `.env` to the distribution URL (e.g. `https://d111111.cloudfront.net`).

## Signed URLs (optional)

For premium content, generate short-lived signed URLs at the API instead of public bucket ACLs.

## CORS

Allow your web origin on the bucket/CDN so `hls.js` can fetch playlists and segments.
