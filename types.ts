
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
