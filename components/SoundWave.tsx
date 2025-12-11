import React from 'react';

interface SoundWaveProps {
  audioLevel?: number; // 0.0 to 1.0
}

const SoundWave: React.FC<SoundWaveProps> = ({ audioLevel = 0 }) => {
  // Custom multipliers to make bars move differently based on the single volume input
  // This simulates the "multi-bar" look from the CSS animation
  const getBarHeight = (index: number) => {
    const baseHeight = 4; // Flat state height in px
    const maxAdditionalHeight = 40; // Max added height when loud

    // Vary responsiveness per bar to create a "wave" effect from a single value
    // We add some random-ish factors consistent per index
    const multiplier = [0.8, 1.2, 1.5, 1.0, 0.7][index] || 1;

    // Calculate target height
    // If audioLevel is very low (< 0.01), stick to base height for a clean "flat" look
    if (audioLevel < 0.01) return baseHeight;

    return baseHeight + (audioLevel * maxAdditionalHeight * multiplier);
  };

  return (
    <div className="flex items-center justify-center gap-[4px] h-[40px] w-full">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-[3px] bg-white rounded-[2px] opacity-80"
          style={{
            height: `${getBarHeight(i)}px`,
            transition: 'height 0.1s ease-out', // Smooth transition
            opacity: Math.max(0.3, audioLevel * 1.2), // Also vary opacity slightly
          }}
        />
      ))}
    </div>
  );
};

export default SoundWave;
