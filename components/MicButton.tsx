import React from 'react';

export type MicButtonState = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'error';

interface MicButtonProps {
  isRecording: boolean;
  onClick: () => void;
  state?: MicButtonState; // Visual state for better UX
  disabled?: boolean;
  size?: number; // Kept for compatibility
  glowColor?: string; // Kept for compatibility but unused in new design
  breathingDuration?: number; // Kept for compatibility but unused
}

const MicButton: React.FC<MicButtonProps> = ({
  isRecording,
  onClick,
  state = 'idle',
  disabled = false,
}) => {
  // State-based styling
  const stateStyles = {
    idle: {
      bg: 'bg-[#1a1a1a]',
      border: 'border-[#333]',
      text: 'text-[#888]',
      hover: 'hover:bg-[#333] hover:text-white',
      glow: '',
    },
    connecting: {
      bg: 'bg-[#1a1a1a]',
      border: 'border-blue-500/50',
      text: 'text-blue-400',
      hover: '',
      glow: 'shadow-lg shadow-blue-500/30 animate-pulse',
    },
    connected: {
      bg: 'bg-[#333]',
      border: 'border-emerald-500/70',
      text: 'text-emerald-400',
      hover: 'hover:bg-[#3d3d3d]',
      glow: 'shadow-lg shadow-emerald-500/40',
    },
    disconnecting: {
      bg: 'bg-[#1a1a1a]',
      border: 'border-orange-500/50',
      text: 'text-orange-400',
      hover: '',
      glow: 'shadow-lg shadow-orange-500/30 animate-pulse',
    },
    error: {
      bg: 'bg-[#1a1a1a]',
      border: 'border-red-500/50',
      text: 'text-red-400',
      hover: 'hover:bg-[#2a1a1a]',
      glow: 'shadow-lg shadow-red-500/30',
    },
  };

  const currentStyle = stateStyles[state];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-[44px] h-[44px] rounded-full
        ${currentStyle.bg} ${currentStyle.border} ${currentStyle.text}
        ${currentStyle.hover} ${currentStyle.glow}
        flex justify-center items-center
        cursor-pointer
        transition-all duration-300 ease-out
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
      `}
      aria-label={
        state === 'connecting'
          ? 'Connecting...'
          : state === 'disconnecting'
            ? 'Disconnecting...'
            : isRecording
              ? 'Stop recording'
              : 'Start recording'
      }
      aria-live="polite"
      aria-busy={state === 'connecting' || state === 'disconnecting'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
        className={`w-[20px] h-[20px] transition-transform duration-200 ${
          isRecording ? 'scale-110' : 'scale-100'
        }`}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    </button>
  );
};

export default MicButton;

