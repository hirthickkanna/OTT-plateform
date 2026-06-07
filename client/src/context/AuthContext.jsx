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
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  const [subscription, setSubscription] = useState(null);

  const [isOffline, setIsOffline] = useState(() => {
    return localStorage.getItem("isOfflineMode") === "true";
  });
  const [downloads, setDownloads] = useState(() => {
    const cached = localStorage.getItem("localDownloads");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return [];
      }
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
    if (!localStorage.getItem("token")) return;
    try {
      const data = await api("/api/downloads");
      setDownloads(data);
      localStorage.setItem("localDownloads", JSON.stringify(data));
    } catch (e) {
      console.error("Failed to load downloads from database", e);
      const cached = localStorage.getItem("localDownloads");
      if (cached) {
        try {
          setDownloads(JSON.parse(cached));
        } catch (err) {
          console.error("Failed to parse cached local downloads", err);
        }
      }
    }
  };

  const downloadMovie = async (videoId) => {
    if (!token) return;
    if (isDownloaded(videoId) || isDownloading(videoId)) return;

    setDownloadProgress((prev) => ({ ...prev, [videoId]: 0 }));
    
    let currentPct = 0;
    const interval = setInterval(() => {
      currentPct += 20;
      setDownloadProgress((prev) => ({ ...prev, [videoId]: Math.min(currentPct, 100) }));
      if (currentPct >= 100) {
        clearInterval(interval);
      }
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
    if (!token) return;
    try {
      await api(`/api/downloads/${videoId}`, {
        method: "DELETE",
      });
      await loadDownloads();
    } catch (e) {
      console.error("Failed to delete download", e);
    }
  };

  const isDownloaded = (videoId) => {
    return downloads.some((d) => d._id === videoId);
  };

  const isDownloading = (videoId) => {
    return downloadProgress[videoId] !== undefined;
  };

  const loadProfile = async () => {
    if (!localStorage.getItem("token")) return;
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
    if (token) {
      loadProfile();
      loadDownloads();
    } else {
      setSubscription(null);
      setDownloads([]);
      setIsOffline(false);
      localStorage.removeItem("isOfflineMode");
    }
  }, [token]);

  const exchangeToken = async (idToken) => {
    const data = await api("/api/auth/firebase", {
      method: "POST",
      body: JSON.stringify({
        idToken,
        deviceId: getDeviceId(),
        deviceName: navigator.userAgent.slice(0, 80),
      }),
    });
    localStorage.setItem("token", data.accessToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    setToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  const login = async (email, password) => {
    let idToken;
    const cleanEmail = email.trim().toLowerCase();
    const isMockEmail = cleanEmail.endsWith(".local");
    if (auth && !isMockEmail) {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      idToken = await userCredential.user.getIdToken();
    } else {
      console.warn("Using dev mock login token");
      idToken = `dev-mock-token-${cleanEmail}`;
    }
    return exchangeToken(idToken);
  };

  const register = async (email, password, displayName) => {
    let idToken;
    const cleanEmail = email.trim().toLowerCase();
    const isMockEmail = cleanEmail.endsWith(".local");
    if (auth && !isMockEmail) {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      await updateProfile(userCredential.user, { displayName });
      idToken = await userCredential.user.getIdToken();
    } else {
      console.warn("Using dev mock registration token");
      idToken = `dev-mock-token-${cleanEmail}`;
    }
    return exchangeToken(idToken);
  };

  const signInWithGoogle = async () => {
    let idToken;
    if (auth && googleProvider) {
      const userCredential = await signInWithPopup(auth, googleProvider);
      idToken = await userCredential.user.getIdToken();
    } else {
      console.warn("Firebase client not configured. Prompting for dev mock Google sign-in...");
      const email = prompt("Enter a test email to simulate Google Sign-In:", "google-user@example.com");
      if (!email) return null;
      idToken = `dev-mock-token-${email}`;
    }
    return exchangeToken(idToken);
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth).catch((err) => console.error("Firebase sign out failed", err));
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isOfflineMode");
    localStorage.removeItem("localDownloads");
    setToken(null);
    setUser(null);
    setDownloads([]);
    setIsOffline(false);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      subscription,
      loadProfile,
      login,
      register,
      signInWithGoogle,
      logout,
      isAuthenticated: !!token,
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
    [token, user, subscription, isOffline, downloads, downloadProgress],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
