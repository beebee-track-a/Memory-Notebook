// Firebase initialization
export { auth, db, storage } from './firebase';

// Authentication
export {
  onAuthChange,
  getCurrentUser,
  signInAnonymous,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  signOut,
  updateDisplayName,
  updatePhotoURL,
} from './auth';

// Firestore & Storage API
export {
  getCurrentUserId,
  isAuthenticated,
  saveUserProfile,
  getUserProfile,
  createChat,
  getChat,
  getUserChats,
  sendMessage,
  subscribeToMessages,
  getMessages,
  uploadPhoto,
  deletePhoto,
  getUserUploads,
} from './firebaseAPI';

// Types (re-export for convenience)
export type {
  UserProfile,
  ChatMessage,
  MessageAttachment,
  Chat,
  UploadMetadata,
} from '../types';
