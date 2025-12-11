import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  User,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from './firebase';
import { saveUserProfile } from './firebaseAPI';
import type { UserProfile } from '../types';

// ============================================================================
// Authentication State
// ============================================================================

/**
 * Subscribe to authentication state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!auth) {
    console.warn('Firebase Auth not initialized');
    callback(null);
    return () => {}; // Return empty unsubscribe function
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Get the current user
 */
export function getCurrentUser(): User | null {
  if (!auth) {
    console.warn('Firebase Auth not initialized');
    return null;
  }
  return auth.currentUser;
}

// ============================================================================
// Sign In Methods
// ============================================================================

/**
 * Sign in anonymously (for quick access without registration)
 */
export async function signInAnonymous(): Promise<User> {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please check your Firebase configuration.');
  }
  try {
    const result = await signInAnonymously(auth);

    // Create basic user profile
    await saveUserProfile({
      uid: result.user.uid,
      displayName: 'Anonymous User',
      createdAt: Date.now(),
      lastActive: Date.now(),
    });

    console.log('✅ Signed in anonymously');
    return result.user;
  } catch (error) {
    console.error('❌ Anonymous sign in error:', error);
    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please check your Firebase configuration.');
  }
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);

    // Update last active
    await saveUserProfile({
      uid: result.user.uid,
      lastActive: Date.now(),
    });

    console.log('✅ Signed in with email');
    return result.user;
  } catch (error) {
    console.error('❌ Email sign in error:', error);
    throw error;
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<User> {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please check your Firebase configuration.');
  }
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // Create/update user profile with Google info
    await saveUserProfile({
      uid: result.user.uid,
      email: result.user.email || undefined,
      displayName: result.user.displayName || undefined,
      photoURL: result.user.photoURL || undefined,
      createdAt: Date.now(),
      lastActive: Date.now(),
    });

    console.log('✅ Signed in with Google');
    return result.user;
  } catch (error) {
    console.error('❌ Google sign in error:', error);
    throw error;
  }
}

// ============================================================================
// Sign Up
// ============================================================================

interface SignUpData {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Create new account with email and password
 */
export async function signUpWithEmail(data: SignUpData): Promise<User> {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please check your Firebase configuration.');
  }
  try {
    const result = await createUserWithEmailAndPassword(auth, data.email, data.password);

    // Update display name if provided
    if (data.displayName) {
      await updateProfile(result.user, {
        displayName: data.displayName,
      });
    }

    // Create user profile
    await saveUserProfile({
      uid: result.user.uid,
      email: result.user.email || undefined,
      displayName: data.displayName || result.user.email?.split('@')[0],
      createdAt: Date.now(),
      lastActive: Date.now(),
    });

    console.log('✅ Account created successfully');
    return result.user;
  } catch (error) {
    console.error('❌ Sign up error:', error);
    throw error;
  }
}

// ============================================================================
// Sign Out
// ============================================================================

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please check your Firebase configuration.');
  }
  try {
    await firebaseSignOut(auth);
    console.log('✅ Signed out successfully');
  } catch (error) {
    console.error('❌ Sign out error:', error);
    throw error;
  }
}

// ============================================================================
// Profile Management
// ============================================================================

/**
 * Update current user's display name
 */
export async function updateDisplayName(displayName: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user signed in');
  }

  try {
    await updateProfile(user, { displayName });
    await saveUserProfile({
      uid: user.uid,
      displayName,
    });
    console.log('✅ Display name updated');
  } catch (error) {
    console.error('❌ Update display name error:', error);
    throw error;
  }
}

/**
 * Update current user's photo URL
 */
export async function updatePhotoURL(photoURL: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user signed in');
  }

  try {
    await updateProfile(user, { photoURL });
    await saveUserProfile({
      uid: user.uid,
      photoURL,
    });
    console.log('✅ Photo URL updated');
  } catch (error) {
    console.error('❌ Update photo URL error:', error);
    throw error;
  }
}
