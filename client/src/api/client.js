const API = import.meta.env.VITE_API_URL || "";

function getToken() {
  return localStorage.getItem("token");
}

export async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  // If the session is invalid/expired, clear local auth state and redirect to login
  if (res.status === 401) {
    localStorage.removeItem("token");
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
  if (url.startsWith("/")) return url;
  if (url.includes("/uploads/")) {
    const idx = url.indexOf("/uploads/");
    return url.substring(idx);
  }
  if (url.startsWith("uploads/")) {
    return "/" + url;
  }
  return url;
}

