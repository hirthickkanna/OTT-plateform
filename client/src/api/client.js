const API = import.meta.env.VITE_API_URL || "";

export async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };

  // LOW-1: No longer read token from localStorage — the httpOnly cookie is sent automatically
  // by the browser when credentials: "include" is set.
  // We only attach Authorization header if it's explicitly passed in options.headers.

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
    credentials: "include", // LOW-1: Send httpOnly cookie with every request
  });

  const data = await res.json().catch(() => ({}));

  // If the session is invalid/expired, clear local auth state and redirect to login
  if (res.status === 401) {
    localStorage.removeItem("user");
    // Only redirect if not already on login page
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = `/login?reason=session_expired`;
    }
    throw new Error(data.message || "Session expired. Please log in again.");
  }

  if (!res.ok) throw new Error(data.message || res.statusText);
  return data;
}

export function getDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

export function normalizeUrl(url) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  let path = url;
  if (url.includes("/uploads/")) {
    const idx = url.indexOf("/uploads/");
    path = url.substring(idx);
  } else if (url.startsWith("uploads/")) {
    path = "/" + url;
  } else if (url.includes("/vod/")) {
    const idx = url.indexOf("/vod/");
    path = url.substring(idx);
  } else if (url.startsWith("vod/")) {
    path = "/" + url;
  } else if (url.startsWith("/")) {
    return url;
  }

  return `${API}${path}`;
}
