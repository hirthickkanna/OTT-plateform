import { createContext, useContext, useMemo, useState } from "react";
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
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      register,
      signInWithGoogle,
      logout,
      isAuthenticated: !!token,
      isFirebaseMock: !auth,
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
