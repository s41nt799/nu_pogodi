import { useEffect, useRef } from 'react';

import { gameConfig } from '../game/config';

export function useGameLoop(onTick: (deltaSeconds: number) => void, active: boolean): void {
  const tickRef = useRef(onTick);

  useEffect(() => {
    tickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!active || typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      return undefined;
    }

    let frameId = 0;
    let lastTime = window.performance.now();

    const frame = (time: number) => {
      const deltaSeconds = Math.min(Math.max((time - lastTime) / 1000, 0), gameConfig.maxFrameDeltaSec);
      lastTime = time;
      tickRef.current(deltaSeconds);
      frameId = window.requestAnimationFrame(frame);
    };

    frameId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [active]);
}
