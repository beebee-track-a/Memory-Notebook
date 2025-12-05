import React, { useEffect, useRef } from 'react';
import { Particle } from '../types';

interface ParticleCanvasProps {
  imageUrl: string | null;
  isActive: boolean;
  audioLevel: number; // 0 to 1
}

const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ imageUrl, isActive, audioLevel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas size initially
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!imageUrl) {
      // LANDING MODE: Random Stardust
      const count = 300;
      const newParticles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        newParticles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          originX: Math.random() * canvas.width,
          originY: Math.random() * canvas.height,
          color: `rgba(200, 220, 255,`, // Bluish white
          size: Math.random() * 2 + 0.5,
          velocity: { x: (Math.random() - 0.5) * 0.2, y: (Math.random() - 0.5) * 0.2 },
          alpha: Math.random() * 0.5 + 0.2,
        });
      }
      particlesRef.current = newParticles;
      return;
    }

    // IMAGE MODE: Sample pixels
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
      // Draw image to a small offscreen canvas to get pixel data efficiently
      const smallCanvas = document.createElement('canvas');
      const sampleRate = 8; // Higher = fewer particles
      const w = Math.floor(window.innerWidth / sampleRate);
      const h = Math.floor(window.innerHeight / sampleRate);
      smallCanvas.width = w;
      smallCanvas.height = h;
      
      const smallCtx = smallCanvas.getContext('2d');
      if (!smallCtx) return;

      // Maintain aspect ratio and fit
      const scale = Math.min(w / img.width, h / img.height) * 0.7; // 0.7 scale to keep it contained
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const offsetX = (w - drawW) / 2;
      const offsetY = (h - drawH) / 2;

      smallCtx.drawImage(img, offsetX, offsetY, drawW, drawH);

      const imageData = smallCtx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const newParticles: Particle[] = [];

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a > 128) {
            newParticles.push({
              x: x * sampleRate + (Math.random() - 0.5) * 20,
              y: y * sampleRate + (Math.random() - 0.5) * 20,
              originX: x * sampleRate,
              originY: y * sampleRate,
              color: `rgba(${r},${g},${b},`,
              size: Math.random() * 2 + 1,
              velocity: { x: 0, y: 0 },
              alpha: Math.random(),
            });
          }
        }
      }
      particlesRef.current = newParticles;
    };

  }, [imageUrl]);

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fade effect for trails
    // If we want clear background for landing, we might want less trail or different color
    ctx.fillStyle = imageUrl ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const particles = particlesRef.current;
    const time = Date.now() * 0.001;

    // Movement intensity based on audio level
    const moveIntensity = 0.5 + (audioLevel * 10); 

    particles.forEach(p => {
      if (imageUrl) {
        // --- IMAGE MODE PHYSICS ---
        // Drift back to origin
        const dx = p.originX - p.x;
        const dy = p.originY - p.y;
        
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = dist * 0.05;
        const angle = Math.atan2(dy, dx);

        p.velocity.x += Math.cos(angle) * force * 0.02;
        p.velocity.y += Math.sin(angle) * force * 0.02;

        // Noise/Wave movement
        p.velocity.x += Math.sin(time + p.y * 0.01) * 0.1 * moveIntensity;
        p.velocity.y += Math.cos(time + p.x * 0.01) * 0.1 * moveIntensity;
      } else {
        // --- LANDING MODE PHYSICS ---
        // Gentle float
        p.x += Math.sin(time * 0.5 + p.originY * 0.1) * 0.5;
        p.y += Math.cos(time * 0.5 + p.originX * 0.1) * 0.5;
        
        // Wrap around screen
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      }

      // Mouse interaction (repel)
      const mouseDx = p.x - mouseRef.current.x;
      const mouseDy = p.y - mouseRef.current.y;
      const mouseDist = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
      if (mouseDist < 150) {
        const repulsion = (150 - mouseDist) / 150;
        const force = imageUrl ? 2 : 0.5; // Stronger interaction on image
        p.velocity.x += (mouseDx / mouseDist) * repulsion * force;
        p.velocity.y += (mouseDy / mouseDist) * repulsion * force;
      }

      // Apply velocity with friction
      p.velocity.x *= 0.9;
      p.velocity.y *= 0.9;

      p.x += p.velocity.x;
      p.y += p.velocity.y;

      // Draw
      ctx.beginPath();
      // Alpha flickers with audio
      const dynamicAlpha = imageUrl 
        ? 0.3 + Math.random() * 0.5 + (audioLevel * 0.2)
        : p.alpha * (0.5 + Math.sin(time + p.x)*0.2); // Gentle flicker for landing

      ctx.fillStyle = p.color + dynamicAlpha + ')';
      const sizeMultiplier = imageUrl ? (1 + audioLevel) : 1;
      ctx.arc(p.x, p.y, p.size * sizeMultiplier, 0, Math.PI * 2);
      ctx.fill();
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, audioLevel, imageUrl]);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-0 transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};

export default ParticleCanvas;