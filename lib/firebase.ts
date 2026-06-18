import { getApps, getApp, initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Firebase web config is not secret — these values are safe to ship to the client.
const firebaseConfig = {
  apiKey: "AIzaSyCTdlW2lGxW4LBfC0AJ7k43Hk3-LtkbigQ",
  authDomain: "sebin-pocket-heist-website.firebaseapp.com",
  projectId: "sebin-pocket-heist-website",
  storageBucket: "sebin-pocket-heist-website.firebasestorage.app",
  messagingSenderId: "81696578192",
  appId: "1:81696578192:web:dbcebf28fc29a0f7585615",
}

// Reuse the existing app across hot reloads / re-imports instead of re-initializing.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
