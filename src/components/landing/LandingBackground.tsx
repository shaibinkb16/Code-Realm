import React, { useEffect, useRef } from 'react';

export const LandingBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle nodes representing digital code realm sparks
    const particleCount = Math.min(50, Math.floor(width / 25));
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      pulseSpeed: number;
    }> = [];

    const colors = ['#38bdf8', '#34d399', '#f59e0b', '#818cf8', '#ec4899'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.2,
        pulseSpeed: 0.01 + Math.random() * 0.02
      });
    }

    let time = 0;

    const render = () => {
      time += 0.01;
      ctx.clearRect(0, 0, width, height);

      // Draw subtle cyber grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.018)';
      ctx.lineWidth = 1;
      const gridSize = 48;
      
      const offsetX = (time * 8) % gridSize;
      const offsetY = (time * 8) % gridSize;

      ctx.beginPath();
      for (let x = offsetX; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = offsetY; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Connect near particles with faint cyber lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - dist / 120) * 0.12})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Update and draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const currentAlpha = p.alpha + Math.sin(time * 3 + p.x) * 0.15;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0.1, Math.min(1, currentAlpha));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="landing-bg-container" aria-hidden="true">
      {/* Dynamic Animated Ambient Glow Orbs */}
      <div className="landing-ambient-glow glow-cyan" />
      <div className="landing-ambient-glow glow-emerald" />
      <div className="landing-ambient-glow glow-amber" />
      <div className="landing-ambient-glow glow-violet" />

      {/* Cyberpunk Grid Particle Canvas */}
      <canvas ref={canvasRef} className="landing-canvas" />

      {/* Radial Vignette Overlay for Crisp Readability */}
      <div className="landing-vignette" />
    </div>
  );
};
