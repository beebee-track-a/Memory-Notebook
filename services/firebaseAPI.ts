import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from 'firebase/storage';
import { auth, db, storage } from './firebase';
import type {
  ChatMessage,
  MessageAttachment,
  Chat,
  UploadMetadata,
  UserProfile,
  SessionData,
  SessionSummary,
  MemoryTurn,
} from '../types';

// ============================================================================
// Authentication Helpers
// ============================================================================

/**
 * Get the current authenticated user's UID
 * Throws an error if user is not authenticated
 */
export function getCurrentUserId(): string {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please check your Firebase configuration.');
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated. Please sign in first.');
  }
  return user.uid;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return auth !== null && auth.currentUser !== null;
}

// ============================================================================
// User Profile API
// ============================================================================

/**
 * Create or update user profile
 */
export async function saveUserProfile(profile: Partial<UserProfile>): Promise<void> {
  const uid = getCurrentUserId();
  const userRef = doc(db, 'users', uid);

  await setDoc(userRef, {
    uid,
    ...profile,
    lastActive: Date.now(),
  }, { merge: true });
}

/**
 * Get user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserProfile;
}

// ============================================================================
// Chat API
// ============================================================================

/**
 * Create a new chat
 */
export async function createChat(name?: string, participantUids?: string[]): Promise<string> {
  const uid = getCurrentUserId();
  const participants = participantUids || [uid];

  if (!participants.includes(uid)) {
    participants.push(uid);
  }

  const chatRef = await addDoc(collection(db, 'chats'), {
    name: name || 'New Chat',
    participants,
    createdBy: uid,
    createdAt: Date.now(),
    messageCount: 0,
  });

  return chatRef.id;
}

/**
 * Get chat by ID
 */
export async function getChat(chatId: string): Promise<Chat | null> {
  const chatRef = doc(db, 'chats', chatId);
  const snapshot = await getDoc(chatRef);

  if (!snapshot.exists()) {
    return null;
  }

  return { id: snapshot.id, ...snapshot.data() } as Chat;
}

/**
 * Get all chats for current user
 */
export async function getUserChats(): Promise<Chat[]> {
  const uid = getCurrentUserId();
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc'),
    limit(50)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
}

// ============================================================================
// Message API
// ============================================================================

interface SendMessageOptions {
  text: string;
  attachments?: MessageAttachment[];
  metadata?: {
    aiModel?: string;
    voiceDetected?: boolean;
  };
}

/**
 * Send a message to a chat
 */
export async function sendMessage(
  chatId: string,
  options: SendMessageOptions
): Promise<string> {
  const uid = getCurrentUserId();
  const user = auth.currentUser;

  // Validate text length
  if (options.text.length > 10000) {
    throw new Error('Message text exceeds maximum length of 10000 characters');
  }

  const messageData = {
    chatId,
    senderUid: uid,
    senderName: user?.displayName || 'Anonymous',
    text: options.text,
    attachments: options.attachments || [],
    createdAt: serverTimestamp(),
    metadata: options.metadata || {},
  };

  // Add message to subcollection
  const messageRef = await addDoc(
    collection(db, 'chats', chatId, 'messages'),
    messageData
  );

  // Update chat metadata
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessageAt: Date.now(),
    lastMessageText: options.text.substring(0, 100),
    messageCount: (await getChat(chatId))?.messageCount || 0 + 1,
  });

  return messageRef.id;
}

/**
 * Subscribe to messages in a chat (real-time updates)
 */
export function subscribeToMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void,
  messagesLimit: number = 50
): Unsubscribe {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(messagesLimit)
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to number
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toMillis()
          : data.createdAt || Date.now(),
      } as ChatMessage;
    }).reverse(); // Reverse to show oldest first

    callback(messages);
  });
}

/**
 * Get messages for a chat (one-time fetch)
 */
export async function getMessages(
  chatId: string,
  messagesLimit: number = 50
): Promise<ChatMessage[]> {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(messagesLimit)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : data.createdAt || Date.now(),
    } as ChatMessage;
  }).reverse();
}

// ============================================================================
// Storage API (Photo Uploads)
// ============================================================================

interface UploadPhotoOptions {
  file: File;
  chatId?: string;
  messageId?: string;
  onProgress?: (progress: number) => void;
}

interface UploadPhotoResult {
  downloadURL: string;
  metadata: UploadMetadata;
  attachment: MessageAttachment;
}

/**
 * Upload a photo to Firebase Storage and save metadata
 */
export async function uploadPhoto(options: UploadPhotoOptions): Promise<UploadPhotoResult> {
  const uid = getCurrentUserId();
  const { file, chatId, messageId, onProgress } = options;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }

  // Validate file size (10MB max)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('File size exceeds 10MB limit');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const storagePath = `uploads/${uid}/${fileName}`;

  // Create storage reference
  const storageRef = ref(storage, storagePath);

  // Upload with progress tracking
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => {
        console.error('Upload error:', error);
        reject(error);
      },
      async () => {
        try {
          // Get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Get image dimensions if possible
          const { width, height } = await getImageDimensions(file);

          // Create upload metadata document
          const uploadId = `upload_${timestamp}_${uid}`;
          const metadata: UploadMetadata = {
            id: uploadId,
            uploaderUid: uid,
            storagePath,
            downloadURL,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            width,
            height,
            createdAt: timestamp,
            associatedChatId: chatId,
            associatedMessageId: messageId,
          };

          // Save metadata to Firestore
          await setDoc(doc(db, 'uploads', uploadId), metadata);

          // Create attachment object for messages
          const attachment: MessageAttachment = {
            id: uploadId,
            type: 'image',
            storagePath,
            downloadURL,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            thumbnailURL: downloadURL, // Can be replaced with actual thumbnail
          };

          resolve({ downloadURL, metadata, attachment });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Helper to get image dimensions
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };

    img.src = url;
  });
}

/**
 * Delete a photo from Storage and its metadata
 */
export async function deletePhoto(uploadId: string): Promise<void> {
  const uploadRef = doc(db, 'uploads', uploadId);
  const uploadDoc = await getDoc(uploadRef);

  if (!uploadDoc.exists()) {
    throw new Error('Upload not found');
  }

  const metadata = uploadDoc.data() as UploadMetadata;

  // Verify ownership
  if (metadata.uploaderUid !== getCurrentUserId()) {
    throw new Error('Unauthorized: You can only delete your own uploads');
  }

  // Delete from Storage
  const storageRef = ref(storage, metadata.storagePath);
  await deleteObject(storageRef);

  // Delete metadata
  await deleteDoc(uploadRef);
}

/**
 * Get user's uploads
 */
export async function getUserUploads(limitCount: number = 20): Promise<UploadMetadata[]> {
  const uid = getCurrentUserId();
  const q = query(
    collection(db, 'uploads'),
    where('uploaderUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as UploadMetadata);
}

// ============================================================================
// Session API
// ============================================================================

interface SaveSessionOptions {
  summary: SessionSummary;
  transcript: MemoryTurn[];
  tags?: string[];
}

/**
 * Save a conversation session to Firebase
 */
export async function saveSession(options: SaveSessionOptions): Promise<string> {
  const uid = getCurrentUserId();

  const sessionData: Omit<SessionData, 'id'> = {
    userUid: uid,
    summary: options.summary,
    transcript: options.transcript,
    createdAt: Date.now(),
    tags: options.tags || [],
    isFavorite: false,
  };

  // Add session to user's sessions collection
  const sessionRef = await addDoc(
    collection(db, 'users', uid, 'sessions'),
    sessionData
  );

  console.log('✅ Session saved to Firebase:', sessionRef.id);
  return sessionRef.id;
}

/**
 * Get all sessions for current user
 */
export async function getUserSessions(limitCount: number = 50): Promise<SessionData[]> {
  const uid = getCurrentUserId();
  const q = query(
    collection(db, 'users', uid, 'sessions'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as SessionData));
}

/**
 * Get a specific session by ID
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  const uid = getCurrentUserId();
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);
  const snapshot = await getDoc(sessionRef);

  if (!snapshot.exists()) {
    return null;
  }

  return { id: snapshot.id, ...snapshot.data() } as SessionData;
}

/**
 * Update session (e.g., toggle favorite, add tags)
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<Omit<SessionData, 'id' | 'userUid' | 'createdAt'>>
): Promise<void> {
  const uid = getCurrentUserId();
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);

  await updateDoc(sessionRef, updates);
  console.log('✅ Session updated');
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const uid = getCurrentUserId();
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);

  await deleteDoc(sessionRef);
  console.log('✅ Session deleted');
}
