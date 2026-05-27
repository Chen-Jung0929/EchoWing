import { useEffect, useRef } from 'react';

export default function StarTrailField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const size = 3000;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const center = size / 2;

    const colors = [
      '205, 224, 239',
      '238, 246, 255',
      '170, 205, 230',
      '220, 200, 190',
    ];

    ctx.clearRect(0, 0, size, size);

    const numTrails = 400;
    for (let i = 0; i < numTrails; i++) {
      const radius = 50 + Math.random() * 1400;
      const startAngle = Math.random() * Math.PI * 2;
      const trailLength = Math.random() * 0.4 + 0.1;
      const endAngle = startAngle + trailLength;

      const baseColor = colors[Math.floor(Math.random() * colors.length)];
      const thickness = Math.random() * 1.5 + 0.8;

      const segments = 20;
      const step = trailLength / segments;
      const overlap = 0.1 / radius;

      for (let j = 0; j < segments; j++) {
        const segStart = startAngle + j * step;
        const segEnd = segStart + step + overlap;

        ctx.beginPath();
        ctx.arc(center, center, radius, segStart, segEnd);

        const opacity = (j / segments) * 0.8;
        ctx.strokeStyle = `rgba(${baseColor}, ${opacity})`;
        ctx.lineWidth = thickness;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(center, center, radius, endAngle, endAngle + 0.001);
      ctx.strokeStyle = `rgba(${baseColor}, 0.8)`;
      ctx.lineCap = 'round';
      ctx.lineWidth = thickness + 0.4;
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }, []);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        top: '0%',
        left: '50%',
        width: '3000px',
        height: '3000px',
        transform: 'translate(-50%, -50%)',
        zIndex: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          opacity: 0.85,
          mixBlendMode: 'screen',
          animation: 'starfield-spin 350s linear infinite',
        }}
      />
    </div>
  );
}
