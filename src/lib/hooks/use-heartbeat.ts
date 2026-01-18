'use client';

import { useCallback, useState } from 'react';

interface HeartbeatOptions {
  duration?: number;
}

export function useHeartbeat(options: HeartbeatOptions = {}) {
  const { duration = 1000 } = options;
  const [isBeating, setIsBeating] = useState(false);

  const trigger = useCallback(() => {
    setIsBeating(true);
    setTimeout(() => setIsBeating(false), duration);
  }, [duration]);

  return { isBeating, trigger };
}
