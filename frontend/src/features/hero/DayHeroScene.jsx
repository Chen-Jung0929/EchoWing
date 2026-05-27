import { useEffect, useState } from 'react';

export default function DayHeroScene() {
  const [entered, setEntered] = useState(false);
  const [birdFrame, setBirdFrame] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEntered(true);
    }, 80);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setBirdFrame((prev) => (prev === 1 ? 2 : 1));
    }, 220);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, #E9D5CC 0%, #DCD7DC 100%)',
        }}
      />

      <img
        src="/day/light-sun.png"
        alt=""
        className={`absolute left-1/2 top-[10%] w-[42vw] max-w-[620px] min-w-[360px] -translate-x-1/2 select-none transition-all duration-[1600ms] ease-out ${
          entered ? 'scale-100 opacity-75' : 'scale-90 opacity-0'
        }`}
      />

      <div
        className={`absolute left-1/2 top-[10%] w-[42vw] max-w-[620px] min-w-[360px] -translate-x-1/2 select-none transition-all duration-[1800ms] ease-out ${
          entered ? 'opacity-75 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <img
          src="/day/light-cloud.png"
          alt=""
          className="w-full h-auto select-none animate-day-cloud-float"
        />
      </div>

      <img
        src="/day/light-left-tree.png"
        alt=""
        className={`absolute left-[0vw] bottom-[2%] w-[48vw] max-w-[760px] min-w-[430px] select-none transition-all duration-[1400ms] ease-out ${
          entered
            ? 'translate-x-0 translate-y-0 opacity-90'
            : '-translate-x-24 translate-y-8 opacity-0'
        }`}
      />

      <img
        src="/day/light-right-tree.png"
        alt=""
        className={`absolute right-[-20vw] bottom-[-20%] w-[48vw] max-w-[800px] min-w-[450px] select-none transition-all duration-[1500ms] ease-out ${
          entered
            ? 'translate-x-0 translate-y-0 opacity-90'
            : 'translate-x-24 translate-y-8 opacity-0'
        }`}
      />

      <div
        className={`absolute left-[40%] top-[18%] w-[10vw] max-w-[1000px] min-w-[650px] select-none transition-opacity duration-700 ${
          entered ? 'opacity-75 animate-day-bird-flight' : 'opacity-0'
        }`}
      >
        <img
          src={`/day/flying-bird${birdFrame}.png`}
          alt=""
          className="w-full h-auto select-none"
        />
      </div>
    </div>
  );
}
