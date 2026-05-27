import { useEffect, useMemo, useState } from 'react';

export default function KiwiAnimation() {
  const [frame, setFrame] = useState(1);
  const [progress01, setProgress01] = useState(0);
  const [imageError, setImageError] = useState(false);

  const STAGE_SIZE = 400;
  const CENTER = STAGE_SIZE / 2;

  const FRUIT_SIZE = 300;
  const FRUIT_LEFT = (STAGE_SIZE - FRUIT_SIZE) / 2;
  const FRUIT_TOP = (STAGE_SIZE - FRUIT_SIZE) / 2;

  const FOOT_ORBIT_RADIUS = 60;

  const FRAME_CONFIG = {
    1: {
      w: 108,
      h: 82,
      footPxX: 8,
      footPxY: 85,
    },
    2: {
      w: 108,
      h: 82,
      footPxX: 8,
      footPxY: 85,
    },
  };

  const cfg = FRAME_CONFIG[frame];

  const START_ANGLE_RAD = Math.PI + Math.PI / 36;

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev === 1 ? 2 : 1));
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress01((prev) => {
        const next = prev + 0.005;
        return next >= 1 ? 0 : next;
      });
    }, 30);

    return () => clearInterval(interval);
  }, []);

  const motion = useMemo(() => {
    const theta = START_ANGLE_RAD + progress01 * Math.PI * 2;

    const footX = CENTER + FOOT_ORBIT_RADIUS * Math.cos(theta);
    const footY = CENTER + FOOT_ORBIT_RADIUS * Math.sin(theta);

    const birdAngleDeg = (theta * 180) / Math.PI + 90;

    const revealDeg =
      (((theta - START_ANGLE_RAD) * 180) / Math.PI + 360) % 360;

    return {
      footX,
      footY,
      birdAngleDeg,
      revealDeg,
    };
  }, [progress01]);

  const revealMask = `conic-gradient(
    from -90deg,
    black 0deg,
    black ${motion.revealDeg}deg,
    transparent ${motion.revealDeg}deg,
    transparent 360deg
  )`;

  if (imageError) {
    return (
      <div className="relative w-64 h-64 flex items-center justify-center text-4xl">
        🥝
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: `${STAGE_SIZE}px`,
        height: `${STAGE_SIZE}px`,
      }}
    >
      <div
        className="absolute"
        style={{
          left: `${FRUIT_LEFT}px`,
          top: `${FRUIT_TOP}px`,
          width: `${FRUIT_SIZE}px`,
          height: `${FRUIT_SIZE}px`,
        }}
      >
        <img
          src="/kiwi-fruit.png"
          alt=""
          className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none opacity-15"
        />

        <img
          src="/kiwi-fruit.png"
          alt="Loading progress"
          className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
          style={{
            WebkitMaskImage: revealMask,
            maskImage: revealMask,
            WebkitMaskSize: '100% 100%',
            maskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
          }}
        />
      </div>

      <div
        className="absolute pointer-events-none"
        style={{
          width: `${cfg.w}px`,
          height: `${cfg.h}px`,
          left: `${motion.footX - cfg.footPxX}px`,
          top: `${motion.footY - cfg.footPxY}px`,
          transform: `rotate(${motion.birdAngleDeg}deg)`,
          transformOrigin: `${cfg.footPxX}px ${cfg.footPxY}px`,
        }}
      >
        <img
          src={`/kiwi${frame}.png`}
          alt="Walking Kiwi"
          onError={() => setImageError(true)}
          className="w-full h-full object-contain drop-shadow-md select-none"
          style={{
            transform: 'scaleX(-1)',
          }}
        />
      </div>
    </div>
  );
}
