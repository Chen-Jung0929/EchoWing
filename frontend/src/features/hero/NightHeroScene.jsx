import { useEffect, useState } from 'react';
import StarTrailField from './StarTrailField';

export default function NightHeroScene() {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEntered(true);
    }, 80);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              circle at 50% 38%,
              rgba(110, 96, 88, 0.22) 0%,
              rgba(61, 52, 47, 0.08) 34%,
              rgba(61, 52, 47, 0) 48%
            ),
            linear-gradient(to bottom, #141A1A 0%, #3D342F 100%)
          `,
        }}
      />

      <StarTrailField />

      <div className="night-star-field" />

      <img
        src="/night/night-left-tree.png"
        alt=""
        className={`absolute left-[0vw] bottom-[-10%] w-[48vw] max-w-[760px] min-w-[430px] select-none transition-all duration-[1400ms] ease-out ${
          entered
            ? 'translate-x-0 translate-y-0 opacity-90'
            : '-translate-x-24 translate-y-8 opacity-0'
        }`}
      />

      <img
        src="/night/night-right-tree.png"
        alt=""
        className={`absolute right-[-15vw] bottom-[-25%] w-[48vw] max-w-[1600px] min-w-[900px] select-none transition-all duration-[1500ms] ease-out ${
          entered
            ? 'translate-x-0 translate-y-0 opacity-90'
            : 'translate-x-24 translate-y-8 opacity-0'
        }`}
      />
    </div>
  );
}
