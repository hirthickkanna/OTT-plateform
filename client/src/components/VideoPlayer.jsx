import Hls from "hls.js";
import { useEffect, useRef } from "react";
import { normalizeUrl } from "../api/client";

/** Returns true if the URL points to an HLS manifest (.m3u8) */
function isHlsUrl(url) {
  try {
    const path = new URL(url).pathname;
    return path.endsWith(".m3u8");
  } catch {
    return url?.includes(".m3u8");
  }
}

export default function VideoPlayer({ src, onProgress }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls;
    const normalizedSrc = normalizeUrl(src);

    if (isHlsUrl(normalizedSrc)) {
      // ── HLS playlist (transcoded / CDN stream) ────────────────────────────
      if (Hls.isSupported()) {
        console.log("[VideoPlayer] Initializing Hls.js for source:", normalizedSrc);
        hls = new Hls({
          xhrSetup: function (xhr, url) {
            if (url.includes("/api/streaming/key/")) {
              const token = localStorage.getItem("token");
              if (token) {
                xhr.setRequestHeader("Authorization", `Bearer ${token}`);
              }
            }
          }
        });
        hls.loadSource(normalizedSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("[VideoPlayer] Manifest parsed successfully, starting playback...");
          video.play().catch((err) => {
            console.warn("[VideoPlayer] Playback failed/blocked:", err);
          });
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("[VideoPlayer] Hls.js error:", event, data);
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        console.log("[VideoPlayer] Using native Safari HLS player for source:", normalizedSrc);
        video.src = normalizedSrc;
        video.load();
        video.play().catch((err) => {
          console.warn("[VideoPlayer] Native playback failed/blocked:", err);
        });
      }
    } else {
      // ── Direct file (MP4, WebM, MOV, etc. from local upload) ─────────────
      video.src = normalizedSrc;
      video.load();
      video.play().catch((err) => {
        console.warn("Direct video play failed or blocked by autoplay policy:", err);
      });
    }


    const tick = () => {
      if (onProgress && !video.paused) {
        onProgress(
          Math.floor(video.currentTime),
          video.duration && video.currentTime / video.duration > 0.9,
        );
      }
    };
    const interval = setInterval(tick, 10000);

    return () => {
      clearInterval(interval);
      if (hls) {
        hls.destroy();
      } else {
        video.pause();
        video.src = "";
        video.load();
      }
    };
  }, [src, onProgress]);

  return (
    <video
      ref={videoRef}
      className="aspect-video w-full bg-black"
      controls
      playsInline
      preload="metadata"
    />
  );
}
