import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, getDeviceId } from "../api/client";
import { auth, googleProvider } from "../api/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // LOW-1 FIX: We no longer store the JWT in localStorage.
  // The server sets it as an httpOnly cookie (inaccessible to JS/XSS).
  // We keep user metadata in localStorage for UI purposes only (not sensitive).
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    try { return u ? JSON.parse(u) : null; } catch { return null; }
  });
  const [subscription, setSubscription] = useState(null);
  // Derive auth state from user object rather than a token in localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem("user"));

  const [isOffline, setIsOffline] = useState(() => {
    return localStorage.getItem("isOfflineMode") === "true";
  });
  const [downloads, setDownloads] = useState(() => {
    const cached = localStorage.getItem("localDownloads");
    if (cached) {
      try { return JSON.parse(cached); } catch { return []; }
    }
    return [];
  });
  const [downloadProgress, setDownloadProgress] = useState({});

  const toggleOffline = () => {
    setIsOffline((prev) => {
      const newVal = !prev;
      localStorage.setItem("isOfflineMode", newVal ? "true" : "false");
      return newVal;
    });
  };

  const loadDownloads = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api("/api/downloads");
      setDownloads(data);
      localStorage.setItem("localDownloads", JSON.stringify(data));
    } catch (e) {
      console.error("Failed to load downloads from database", e);
      const cached = localStorage.getItem("localDownloads");
      if (cached) {
        try { setDownloads(JSON.parse(cached)); } catch {}
      }
    }
  };

  const downloadMovie = async (videoId) => {
    if (!isAuthenticated) return;
    if (isDownloaded(videoId) || isDownloading(videoId)) return;

    setDownloadProgress((prev) => ({ ...prev, [videoId]: 0 }));

    let currentPct = 0;
    const interval = setInterval(() => {
      currentPct += 20;
      setDownloadProgress((prev) => ({ ...prev, [videoId]: Math.min(currentPct, 100) }));
      if (currentPct >= 100) clearInterval(interval);
    }, 400);

    setTimeout(async () => {
      try {
        await api("/api/downloads", {
          method: "POST",
          body: JSON.stringify({ videoId }),
        });
        await loadDownloads();
      } catch (e) {
        console.error("Failed to save download in DB", e);
      } finally {
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[videoId];
          return next;
        });
      }
    }, 2400);
  };

  const removeDownload = async (videoId) => {
    if (!isAuthenticated) return;
    try {
      await api(`/api/downloads/${videoId}`, { method: "DELETE" });
      await loadDownloads();
    } catch (e) {
      console.error("Failed to delete download", e);
    }
  };

  const isDownloaded = (videoId) => downloads.some((d) => d._id === videoId);
  const isDownloading = (videoId) => downloadProgress[videoId] !== undefined;

  const loadProfile = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api("/api/auth/me");
      setSubscription(data.subscription);
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
    } catch (e) {
      console.error("Failed to load profile", e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
      loadDownloads();
    } else {
      setSubscription(null);
      setDownloads([]);
      setIsOffline(false);
      localStorage.removeItem("isOfflineMode");
    }
  }, [isAuthenticated]);

  /**
   * After server sets httpOnly cookie, store only user metadata (not the token) in localStorage.
   * LOW-1: The actual JWT lives only in the httpOnly cookie — never in localStorage.
   */
  function persistUser(userData) {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  }

  const exchangeToken = async (idToken) => {
    const data = await api("/api/auth/firebase", {
      method: "POST",
      body: JSON.stringify({
        idToken,
        deviceId: getDeviceId(),
        deviceName: navigator.userAgent.slice(0, 80),
      }),
    });
    // LOW-1: Do NOT store data.accessToken in localStorage — the server sets it as httpOnly cookie.
    // We only persist the user metadata for UI state.
    persistUser(data.user);
    return data;
  };

  const login = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();

    // MED-5 FIX: Mock login bypass (.local emails) is only allowed in DEV mode.
    // In production builds (import.meta.env.PROD), all logins go through Firebase.
    const isMockEmail = cleanEmail.endsWith(".local");
    if (isMockEmail && !import.meta.env.DEV) {
      throw new Error("Mock login is disabled in production.");
    }

    let idToken;
    if (auth && !isMockEmail) {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      idToken = await userCredential.user.getIdToken();
    } else {
      if (import.meta.env.DEV) {
        console.warn("Using dev mock login token");
        idToken = `dev-mock-token-${cleanEmail}`;
      } else {
        throw new Error("Firebase not configured.");
      }
    }
    return exchangeToken(idToken);
  };

  const register = async (email, password, displayName) => {
    const cleanEmail = email.trim().toLowerCase();
    const isMockEmail = cleanEmail.endsWith(".local");

    // MED-5 FIX: Same mock-only-in-dev guard for registration
    if (isMockEmail && !import.meta.env.DEV) {
      throw new Error("Mock registration is disabled in production.");
    }

    let idToken;
    if (auth && !isMockEmail) {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      await updateProfile(userCredential.user, { displayName });
      idToken = await userCredential.user.getIdToken();
    } else {
      if (import.meta.env.DEV) {
        console.warn("Using dev mock registration token");
        idToken = `dev-mock-token-${cleanEmail}`;
      } else {
        throw new Error("Firebase not configured.");
      }
    }
    return exchangeToken(idToken);
  };

  const signInWithGoogle = async () => {
    if (auth && googleProvider) {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const idToken = await userCredential.user.getIdToken();
      return exchangeToken(idToken);
    }

    // MED-5 FIX: Google mock sign-in only allowed in DEV
    if (import.meta.env.DEV) {
      console.warn("Firebase client not configured. Prompting for dev mock Google sign-in...");
      const email = prompt("Enter a test email to simulate Google Sign-In:", "google-user@example.com");
      if (!email) return null;
      const idToken = `dev-mock-token-${email}`;
      return exchangeToken(idToken);
    }

    throw new Error("Google sign-in is not configured.");
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth).catch((err) => console.error("Firebase sign out failed", err));
    }
    // Call the backend logout endpoint to clear the httpOnly cookie
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {}
    // Clear only UI state from localStorage (no token was stored here)
    localStorage.removeItem("user");
    localStorage.removeItem("isOfflineMode");
    localStorage.removeItem("localDownloads");
    setUser(null);
    setIsAuthenticated(false);
    setDownloads([]);
    setIsOffline(false);
  };

  const value = useMemo(
    () => ({
      user,
      subscription,
      loadProfile,
      login,
      register,
      signInWithGoogle,
      logout,
      isAuthenticated,
      isFirebaseMock: !auth,
      isOffline,
      toggleOffline,
      downloads,
      downloadProgress,
      downloadMovie,
      removeDownload,
      isDownloaded,
      isDownloading,
    }),
    [user, subscription, isAuthenticated, isOffline, downloads, downloadProgress],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
