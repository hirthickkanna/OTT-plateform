import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Private key might have \n characters in the env string, so replace them with actual newlines
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

let firebaseApp = null;

try {
  if (projectId && clientEmail && privateKey) {
    firebaseApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("Firebase Admin SDK successfully initialized.");
  }
} catch (error) {
  console.error("Firebase Admin SDK initialization failed:", error);
}

export async function verifyFirebaseToken(idToken) {
  if (!idToken) {
    throw new Error("No Firebase ID token provided");
  }

  // Support dev mock token bypass always for easy local testing
  if (idToken.startsWith("dev-mock-token-")) {
    console.warn("Using developer mock token bypass.");
    const email = idToken.replace("dev-mock-token-", "");
    return {
      uid: `dev-mock-uid-${email}`,
      email: email,
      name: email.split("@")[0],
    };
  }

  if (!firebaseApp) {
    throw new Error("Firebase Admin not initialized. Use 'dev-mock-token-your@email.com' for development bypass.");
  }

  try {
    const decodedToken = await getAuth(firebaseApp).verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email?.split("@")[0] || "Firebase User",
    };
  } catch (error) {
    console.error("Firebase ID Token verification failed:", error);
    throw new Error("Invalid Firebase ID token");
  }
}
