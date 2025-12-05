export type AppState = 'LANDING' | 'UPLOAD' | 'RENDERING' | 'SESSION' | 'REVIEW';

export type SessionState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

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

export interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  color: string;
  size: number;
  velocity: { x: number; y: number };
  alpha: number;
}
