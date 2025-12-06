import React, { useState, useEffect } from 'react';

interface VoiceSubtitleProps {
  text: string;
  isVisible: boolean;
  maxWidth?: string; // e.g., "70%"
  opacity?: number; // 0.3 - 0.8
  fontSize?: string; // e.g., "text-2xl"
  position?: 'top' | 'center' | 'bottom'; // Position on screen
  typewriterEffect?: boolean; // Enable character-by-character reveal
  typewriterSpeed?: number; // Characters per second
}

const VoiceSubtitle: React.FC<VoiceSubtitleProps> = ({
  text,
  isVisible,
  maxWidth = "80%",
  opacity = 0.9,
  fontSize = "text-3xl md:text-4xl",
  position = "bottom",
  typewriterEffect = true,
  typewriterSpeed = 40, // Faster typing
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isFullyDisplayed, setIsFullyDisplayed] = useState(false);

  // Typewriter effect
  useEffect(() => {
    if (!typewriterEffect || !text) {
      setDisplayedText(text);
      setIsFullyDisplayed(true);
      return;
    }

    setIsFullyDisplayed(false);
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsFullyDisplayed(true);
        clearInterval(interval);
      }
    }, 1000 / typewriterSpeed);

    return () => clearInterval(interval);
  }, [text, typewriterEffect, typewriterSpeed]);

  // Reset when text changes
  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsFullyDisplayed(false);
    }
  }, [text]);

  // Position classes
  const positionClasses = {
    top: 'top-24',
    center: 'top-1/2 -translate-y-1/2',
    bottom: 'bottom-32'
  };

  if (!isVisible || !text) return null;

  return (
    <div
      className={`absolute ${positionClasses[position]} left-1/2 -translate-x-1/2 z-30 transition-all duration-500 ease-out ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      style={{ maxWidth }}
    >
      <div
        className="px-8 py-6 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl transition-all duration-300 transform hover:scale-105"
        style={{
          backgroundColor: `rgba(255, 255, 255, 0.05)`, // Much lighter, cleaner glass feel
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        }}
      >
        <p
          className={`${fontSize} font-medium tracking-tight text-white text-center transition-all duration-300 font-sans`}
          style={{
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
            lineHeight: '1.4',
            wordBreak: 'break-word',
          }}
        >
          {displayedText}
          {typewriterEffect && !isFullyDisplayed && (
            <span className="inline-block w-3 h-3 bg-white rounded-full ml-2 animate-pulse" />
          )}
        </p>
      </div>
    </div>
  );
};

export default VoiceSubtitle;

