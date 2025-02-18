import { useState, useEffect, useCallback } from "react";

interface LongPressOptions {
  threshold?: number;
  onLongPress: () => void;
}

export function useLongPress({ onLongPress, threshold = 500 }: LongPressOptions) {
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    // Start the timer on press start
    const timer = setTimeout(() => {
      onLongPress();
    }, threshold);
    setPressTimer(timer);
  }, [onLongPress, threshold]);

  const clear = useCallback(() => {
    // Clear the timer if the press ends before threshold
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  }, [pressTimer]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      clear();
    };
  }, [clear]);

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchEnd: clear
  };
}
