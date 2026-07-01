/**
 * Tracks browser frame rate and reports significant changes (e.g. to PostHog).
 *
 * Example query (PostHog SQL):
 *
 * SELECT
 *     timestamp,
 *     distinct_id,
 *     properties.fps AS fps,
 *     properties.change AS change
 * FROM events
 * WHERE event = 'frame_rate'
 * ORDER BY timestamp DESC
 */
import { useEffect, useRef, useState } from 'react';

class FPSMonitor {
  fps: number;

  previousFps: number;

  frameCount: number;

  lastTime: number;

  isRunning: boolean;

  animationFrameId: number | null;

  onFPSUpdate?: (fps: number, change: number | null) => void;

  constructor() {
    this.fps = 0;
    this.previousFps = 0;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.isRunning = false;
    this.animationFrameId = null;
  }

  start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.tick();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  tick() {
    if (!this.isRunning) {
      return;
    }

    const currentTime = performance.now();
    this.frameCount += 1;

    if (currentTime - this.lastTime >= 1000) {
      this.previousFps = this.fps;
      this.fps = Math.round(
        (this.frameCount * 1000) / (currentTime - this.lastTime),
      );
      this.frameCount = 0;
      this.lastTime = currentTime;

      const change = this.fps - this.previousFps;

      this.onFPSUpdate?.(this.fps, change);
    }

    this.animationFrameId = requestAnimationFrame(() => this.tick());
  }

  getCurrentFPS() {
    return this.fps;
  }
}

const globalFpsMonitor = new FPSMonitor();

interface PerformanceMonitorOptions {
  enabled?: boolean;
  logToConsole?: boolean;
  onFPSUpdate?: (fps: number, change: number | null) => void;
  significantChangeThreshold?: number;
  onSignificantChange?: (fps: number, change: number) => void;
}

export const usePerformanceMonitor = (
  options: PerformanceMonitorOptions = {},
) => {
  const {
    enabled = true,
    logToConsole = false,
    onFPSUpdate,
    significantChangeThreshold = 5,
    onSignificantChange,
  } = options;

  const [fps, setFps] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const callbackRef = useRef<{
    onFPSUpdate: typeof onFPSUpdate;
    onSignificantChange: typeof onSignificantChange;
    logToConsole: boolean;
    threshold: number;
  }>({
    onFPSUpdate,
    onSignificantChange,
    logToConsole,
    threshold: significantChangeThreshold,
  });

  useEffect(() => {
    callbackRef.current = {
      onFPSUpdate,
      onSignificantChange,
      logToConsole,
      threshold: significantChangeThreshold,
    };
  }, [
    onFPSUpdate,
    onSignificantChange,
    logToConsole,
    significantChangeThreshold,
  ]);

  useEffect(() => {
    const handleFpsUpdate = (currentFps: number, change: number | null) => {
      setFps(currentFps);

      if (callbackRef.current.logToConsole) {
        // eslint-disable-next-line no-console
        console.info(`Current FPS: ${currentFps}, Change: ${change}`);
      }

      if (callbackRef.current.onFPSUpdate) {
        callbackRef.current.onFPSUpdate(currentFps, change);
      }

      if (
        callbackRef.current.onSignificantChange &&
        change !== null &&
        Math.abs(change) >= callbackRef.current.threshold
      ) {
        callbackRef.current.onSignificantChange(currentFps, change);
      }
    };
    globalFpsMonitor.onFPSUpdate = handleFpsUpdate;

    if (enabled && !globalFpsMonitor.isRunning) {
      globalFpsMonitor.start();
      setIsRunning(true);
    } else if (!enabled && globalFpsMonitor.isRunning) {
      globalFpsMonitor.stop();
      setIsRunning(false);
    }

    return () => {
      if (globalFpsMonitor.isRunning) {
        globalFpsMonitor.stop();
        setIsRunning(false);
      }
    };
  }, [enabled]);

  return {
    fps,
    isRunning,
  };
};

export default usePerformanceMonitor;
