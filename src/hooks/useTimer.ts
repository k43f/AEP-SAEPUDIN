import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer(onFinish?: () => void, onTick?: (remaining: number) => void) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback((seconds: number) => {
    if (seconds > 0) {
      setTimeLeft(seconds);
      setIsActive(true);
    }
  }, []);

  const toggle = useCallback(() => {
    setIsActive(prev => !prev);
  }, []);

  const reset = useCallback((seconds?: number) => {
    setIsActive(false);
    if (seconds !== undefined) {
      setTimeLeft(seconds);
    }
  }, []);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const next = prev - 1;
          if (onTick) onTick(next);
          if (next <= 0) {
            setIsActive(false);
            if (onFinish) onFinish();
            return 0;
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, onFinish, onTick]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return { timeLeft, isActive, start, toggle, reset, formatTime, setTimeLeft };
}
