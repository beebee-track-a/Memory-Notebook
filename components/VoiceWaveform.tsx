import React, { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  audioLevel: number; // 0.0 - 1.0
  isActive: boolean; // Show/hide the waveform
  type?: 'line' | 'bars' | 'circular' | 'organic'; // Visualization style
  color?: string;
  barCount?: number; // For 'bars' type
  smoothing?: number; // 0-1, higher = smoother transitions
  height?: number; // Height in pixels
  width?: string; // Width (e.g., "300px", "80%")
}

const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  audioLevel,
  isActive,
  type = 'organic',
  color = 'rgba(255, 255, 255, 0.8)',
  barCount = 40,
  smoothing = 0.7,
  height = 60,
  width = '300px',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const barsRef = useRef<number[]>(Array(barCount).fill(0));
  const smoothedLevelRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      if (!ctx || !canvas) return;

      // Smooth the audio level
      smoothedLevelRef.current += (audioLevel - smoothedLevelRef.current) * (1 - smoothing);
      const level = smoothedLevelRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (type === 'bars') {
        drawBars(ctx, rect.width, rect.height, level);
      } else if (type === 'line') {
        drawLine(ctx, rect.width, rect.height, level);
      } else if (type === 'circular') {
        drawCircular(ctx, rect.width, rect.height, level);
      } else if (type === 'organic') {
        drawOrganicWave(ctx, rect.width, rect.height, level);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioLevel, type, smoothing, barCount, color]);

  const drawBars = (ctx: CanvasRenderingContext2D, w: number, h: number, level: number) => {
    const barWidth = w / barCount;
    const centerY = h / 2;

    for (let i = 0; i < barCount; i++) {
      // Create wave pattern with audio reactivity
      const phase = (Date.now() * 0.002) + (i * 0.3);
      const baseHeight = Math.sin(phase) * 10;
      const targetHeight = baseHeight + (level * h * 0.4);

      // Smooth bar height
      barsRef.current[i] += (targetHeight - barsRef.current[i]) * 0.3;

      const barHeight = Math.max(2, Math.abs(barsRef.current[i]));
      const x = i * barWidth + barWidth / 4;

      ctx.fillStyle = color;
      ctx.fillRect(x, centerY - barHeight / 2, barWidth / 2, barHeight);
    }
  };

  const drawLine = (ctx: CanvasRenderingContext2D, w: number, h: number, level: number) => {
    const points = 100;
    const centerY = h / 2;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    for (let i = 0; i < points; i++) {
      const x = (i / points) * w;
      const phase = (Date.now() * 0.003) + (i * 0.1);
      const y = centerY + Math.sin(phase) * (10 + level * 30);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  };

  const drawCircular = (ctx: CanvasRenderingContext2D, w: number, h: number, level: number) => {
    const centerX = w / 2;
    const centerY = h / 2;
    const baseRadius = Math.min(w, h) * 0.3;
    const segments = 60;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const phase = (Date.now() * 0.002) + (i * 0.2);
      const radiusOffset = Math.sin(phase) * (5 + level * 15);
      const radius = baseRadius + radiusOffset;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.stroke();
  };

  const drawOrganicWave = (ctx: CanvasRenderingContext2D, w: number, h: number, level: number) => {
    const centerY = h / 2;
    const points = 150;
    const time = Date.now() * 0.001;

    // Idle breathing when audio level is low
    const idleAmplitude = 8;
    const activeAmplitude = level * h * 0.35;
    const totalAmplitude = idleAmplitude + activeAmplitude;

    // Draw multiple layered waves with gradient colors
    const layers = [
      { frequency: 0.015, speed: 0.5, amplitude: 1.0, alpha: 0.3, offset: 0 },
      { frequency: 0.02, speed: 0.7, amplitude: 0.8, alpha: 0.5, offset: Math.PI / 3 },
      { frequency: 0.025, speed: 1.0, amplitude: 1.2, alpha: 0.7, offset: Math.PI / 2 },
    ];

    layers.forEach((layer, layerIndex) => {
      ctx.beginPath();
      ctx.lineWidth = 3 + layerIndex;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Create gradient from cyan to purple
      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, `rgba(34, 211, 238, ${layer.alpha})`);
      gradient.addColorStop(0.5, `rgba(168, 85, 247, ${layer.alpha})`);
      gradient.addColorStop(1, `rgba(236, 72, 153, ${layer.alpha})`);
      ctx.strokeStyle = gradient;

      for (let i = 0; i < points; i++) {
        const x = (i / points) * w;

        // Create organic movement with multiple sine waves
        const phase1 = x * layer.frequency + time * layer.speed + layer.offset;
        const phase2 = x * layer.frequency * 1.5 - time * layer.speed * 0.7;
        const phase3 = x * layer.frequency * 0.5 + time * layer.speed * 1.3;

        const wave1 = Math.sin(phase1);
        const wave2 = Math.sin(phase2) * 0.5;
        const wave3 = Math.sin(phase3) * 0.3;

        const combinedWave = (wave1 + wave2 + wave3) / 1.8;
        const y = centerY + combinedWave * totalAmplitude * layer.amplitude;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    });
  };

  if (!isActive) return null;

  return (
    <div
      className="transition-all duration-300 ease-out"
      style={{
        opacity: isActive ? 1 : 0,
        transform: isActive ? 'scale(1)' : 'scale(0.9)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width, height: `${height}px` }}
        className="drop-shadow-lg"
      />
    </div>
  );
};

export default VoiceWaveform;

