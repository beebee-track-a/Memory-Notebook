import React, { useEffect, useRef } from 'react';
import { AMBIENT_MUSIC_URL } from '../constants';

interface AmbiencePlayerProps {
  play: boolean;
  ducking: boolean; // True if AI or User is speaking
  volume: number;
}

const AmbiencePlayer: React.FC<AmbiencePlayerProps> = ({ play, ducking, volume }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(AMBIENT_MUSIC_URL);
      audioRef.current.loop = true;
    }

    if (play) {
      audioRef.current.play().catch(e => console.warn("Autoplay blocked:", e));
    } else {
      audioRef.current.pause();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [play]);

  useEffect(() => {
    if (audioRef.current) {
      // Calculate target volume: User set volume * (ducking factor)
      const targetVolume = volume * (ducking ? 0.2 : 1.0);
      
      // Smooth fade
      const fade = setInterval(() => {
        if (!audioRef.current) {
            clearInterval(fade);
            return;
        }
        
        const diff = targetVolume - audioRef.current.volume;
        if (Math.abs(diff) < 0.05) {
          audioRef.current.volume = targetVolume;
          clearInterval(fade);
        } else {
          audioRef.current.volume += diff * 0.1;
        }
      }, 50);

      return () => clearInterval(fade);
    }
  }, [volume, ducking]);

  return null; // Invisible component
};

export default AmbiencePlayer;
