import React from 'react';
import SoundWave from './SoundWave';
import MicButton, { MicButtonState } from './MicButton';

interface VoiceControlCardProps {
  audioLevel?: number; // 0.0 - 1.0 for soundwave visualization
  isRecording: boolean;
  micState?: MicButtonState;
  onMicClick: () => void;
  disabled?: boolean;
  placeholder?: string; // Optional text hint
  width?: string; // e.g., "320px", "100%"
  showPlaceholder?: boolean;
}

/**
 * VoiceControlCard - Unified horizontal card with soundwave (left) and mic button (right)
 * Based on soundwave.html design, adapted for single-row layout
 */
const VoiceControlCard: React.FC<VoiceControlCardProps> = ({
  audioLevel = 0,
  isRecording,
  micState = 'idle',
  onMicClick,
  disabled = false,
  placeholder = 'Tap mic to speak',
  width = '320px',
  showPlaceholder = true,
}) => {
  return (
    <div
      className="
        bg-[rgba(20,20,20,0.95)]
        border border-white/10
        rounded-3xl
        px-6 py-4
        backdrop-blur-sm
        shadow-xl
        relative
        z-50
      "
      style={{ width, maxWidth: '90vw', pointerEvents: 'auto' }}
    >
      {/* Horizontal layout: soundwave left, mic right */}
      <div className="flex items-center justify-between gap-4">

        {/* Left: Soundwave Visualizer */}
        <div className="flex-1 flex items-center gap-3">
          <SoundWave audioLevel={audioLevel} />

          {/* Optional placeholder text */}
          {showPlaceholder && !isRecording && (
            <span className="text-sm text-white/40 font-light whitespace-nowrap hidden sm:inline">
              {placeholder}
            </span>
          )}

          {isRecording && (
            <span className="text-sm text-emerald-400 font-light whitespace-nowrap hidden sm:inline">
              ● Live
            </span>
          )}
        </div>

        {/* Right: Mic Button */}
        <div className="flex-shrink-0">
          <MicButton
            isRecording={isRecording}
            onClick={onMicClick}
            state={micState}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};

export default VoiceControlCard;
