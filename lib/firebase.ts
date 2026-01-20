import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";
import "firebase/compat/analytics";

/**
 * Firebase Configuration
 * Pulls from Vite environment variables (VITE_ prefix is required for client-side access)
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase App instance (Singleton pattern)
const app = firebase.apps.length > 0 ? firebase.app() : firebase.initializeApp(firebaseConfig);

// Initialize core services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Analytics initialization with environment safety
let analytics: firebase.analytics.Analytics | null = null;

if (typeof window !== "undefined") {
  // Check if browser environment supports analytics (prevents crashes in private/incognito modes)
  firebase.analytics.isSupported().then((supported) => {
    if (supported) {
      analytics = firebase.analytics();
    }
  }).catch(err => {
    console.warn("Firebase Analytics support check failed:", err);
  });
}

/**
 * EXPORTS
 * Usage: import { auth, db } from '@/lib/firebase'
 */
export { app, auth, db, storage, analytics };
export default firebase;
