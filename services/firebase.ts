import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate required configuration
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

// Initialize Firebase
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let initializationError: string | null = null;

if (missingKeys.length > 0) {
  const errorMsg = `Missing Firebase configuration keys: ${missingKeys.join(', ')}. Please check your .env file and ensure all VITE_FIREBASE_* variables are set. See FIREBASE_SETUP.md for setup instructions.`;
  console.error('❌', errorMsg);
  initializationError = errorMsg;
} else {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // Enable offline persistence for Firestore
    if (typeof window !== 'undefined') {
      enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Firestore persistence failed: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
          console.warn('Firestore persistence not available in this browser');
        }
      });
    }

    // Connect to emulators if in development mode
    if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
      console.log('🔧 Connecting to Firebase Emulators...');
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);
    }

    console.log('✅ Firebase initialized successfully');
  } catch (error: any) {
    const errorMsg = `Firebase initialization failed: ${error?.message || 'Unknown error'}. Please check your Firebase configuration.`;
    console.error('❌', errorMsg);
    console.error('Full error:', error);
    initializationError = errorMsg;
    // Don't throw - allow app to continue without Firebase
  }
}

// Export initialized instances (may be null if initialization failed)
export { app, auth, db, storage, initializationError };
