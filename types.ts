
export type AppState = 'LANDING' | 'UPLOAD' | 'RENDERING' | 'SESSION' | 'SUMMARY' | 'REVIEW';

export type SessionState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

export type VoiceConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface MemoryTurn {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface PhotoData {
  file: File;
  previewUrl: string;
  base64Data: string;
  mimeType: string;
}

// New types for custom photo uploads
export interface UploadedPhoto {
  id: string;              // Unique identifier
  previewUrl: string;      // Data URL for display
  base64Data: string;      // Base64 for API (if needed)
  mimeType: string;        // Image MIME type
  uploadedAt: number;      // Timestamp
}

// Session summary data from AI
export interface SessionSummary {
  aiGeneratedSummary: string;  // AI-written summary of the conversation
  duration: number;             // Session length in seconds
  turnCount: number;            // Total conversation turns
  userMessageCount: number;     // User messages only
  aiMessageCount: number;       // AI messages only
  startTime: number;            // Session start timestamp
  endTime: number;              // Session end timestamp
}

// Session data stored in Firebase sessions/{sessionId}
export interface SessionData {
  id?: string;                  // Document ID (auto-generated)
  userUid: string;              // User who created this session
  summary: SessionSummary;      // Session summary data
  transcript: MemoryTurn[];     // Full conversation transcript
  createdAt: number;            // Timestamp when session was created
  tags?: string[];              // Optional tags for categorization
  isFavorite?: boolean;         // User can mark favorites
}

export interface Particle {
  x: number;      // World Space X
  y: number;      // World Space Y
  z: number;      // World Space Z
  originX: number;
  originY: number;
  originZ: number;
  color: string;  // rgb(r,g,b) string
  baseSize: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;   // For sparkles/fading
}

// Firebase Firestore Types

// User profile stored in users/{uid}
export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  createdAt: number;
  lastActive: number;
  settings?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
  };
}

// Chat message stored in chats/{chatId}/messages/{messageId}
export interface ChatMessage {
  id: string;
  chatId: string;
  senderUid: string;
  senderName?: string;
  text: string;
  attachments?: MessageAttachment[];
  createdAt: number; // Will use serverTimestamp() on write
  updatedAt?: number;
  metadata?: {
    aiModel?: string;
    voiceDetected?: boolean;
  };
}

// Attachment reference in messages
export interface MessageAttachment {
  id: string;
  type: 'image' | 'audio' | 'file';
  storagePath: string;      // Path in Firebase Storage
  downloadURL: string;      // Public download URL
  fileName: string;
  mimeType: string;
  size: number;             // File size in bytes
  thumbnailURL?: string;    // Optional thumbnail for images
}

// Chat metadata stored in chats/{chatId}
export interface Chat {
  id: string;
  name?: string;
  participants: string[];   // Array of user UIDs
  createdBy: string;
  createdAt: number;
  lastMessageAt?: number;
  lastMessageText?: string;
  messageCount: number;
}

// Photo upload metadata stored in uploads/{uploadId}
export interface UploadMetadata {
  id: string;
  uploaderUid: string;
  storagePath: string;      // uploads/{uid}/{uuid}.{ext}
  downloadURL: string;
  fileName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  createdAt: number;
  tags?: string[];
  associatedChatId?: string;
  associatedMessageId?: string;
}
