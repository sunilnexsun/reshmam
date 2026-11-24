/** Public web config for the reshmam-oil Firebase project (safe to ship to browsers). */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDWfC3Z-5nYzmDKIoLRwRCAkCQhIKQH8LI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "reshmam-oil.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "reshmam-oil",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "reshmam-oil.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "245127746311",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:245127746311:web:fb9041eea8686cb0e06ba2",
};
