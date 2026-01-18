'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTypewriterOptions {
  /** Characters per second */
  speed?: number;
  /** Delay before starting (ms) */
  delay?: number;
  /** Random variation in speed (0-1) */
  jitter?: number;
  /** Callback when typing completes */
  onComplete?: () => void;
}

interface UseTypewriterReturn {
  /** Current displayed text */
  displayedText: string;
  /** Whether typing is in progress */
  isTyping: boolean;
  /** Whether typing has completed */
  isComplete: boolean;
  /** Skip to the end immediately */
  skip: () => void;
  /** Reset and start over */
  reset: () => void;
}

export function useTypewriter(
  text: string,
  options: UseTypewriterOptions = {}
): UseTypewriterReturn {
  const {
    speed = 40,
    delay = 0,
    jitter = 0.3,
    onComplete,
  } = options;

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const skip = useCallback(() => {
    clearTimeouts();
    setDisplayedText(text);
    setIsTyping(false);
    setIsComplete(true);
  }, [text, clearTimeouts]);

  const reset = useCallback(() => {
    clearTimeouts();
    setDisplayedText('');
    setIsTyping(false);
    setIsComplete(false);
  }, [clearTimeouts]);

  // Main typing effect
  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsTyping(false);
      setIsComplete(false);
      return;
    }

    let currentIndex = 0;
    let cancelled = false;

    const typeChar = () => {
      if (cancelled) return;
      
      if (currentIndex < text.length) {
        currentIndex++;
        setDisplayedText(text.slice(0, currentIndex));

        // Calculate next delay with jitter
        const baseDelay = 1000 / speed;
        const variation = baseDelay * jitter * (Math.random() - 0.5) * 2;
        const nextDelay = Math.max(10, baseDelay + variation);

        timeoutRef.current = setTimeout(typeChar, nextDelay);
      } else {
        setIsTyping(false);
        setIsComplete(true);
        onComplete?.();
      }
    };

    const startTyping = () => {
      if (cancelled) return;
      setDisplayedText('');
      setIsTyping(true);
      setIsComplete(false);
      typeChar();
    };

    if (delay > 0) {
      timeoutRef.current = setTimeout(startTyping, delay);
    } else {
      startTyping();
    }

    return () => {
      cancelled = true;
      clearTimeouts();
    };
  }, [text, speed, delay, jitter, onComplete, clearTimeouts]);

  return {
    displayedText,
    isTyping,
    isComplete,
    skip,
    reset,
  };
}

/**
 * Hook for dual-language typewriter effect
 * Types both languages simultaneously
 */
export function useDualTypewriter(
  textEn: string,
  textCn: string,
  options: UseTypewriterOptions = {}
) {
  const { speed = 40, delay = 0, jitter = 0.3, onComplete } = options;

  const [displayedEn, setDisplayedEn] = useState('');
  const [displayedCn, setDisplayedCn] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const skip = useCallback(() => {
    clearTimeouts();
    setDisplayedEn(textEn);
    setDisplayedCn(textCn);
    setIsTyping(false);
    setIsComplete(true);
  }, [textEn, textCn, clearTimeouts]);

  const reset = useCallback(() => {
    clearTimeouts();
    setDisplayedEn('');
    setDisplayedCn('');
    setIsTyping(false);
    setIsComplete(false);
  }, [clearTimeouts]);

  // Main typing effect
  useEffect(() => {
    if (!textEn && !textCn) {
      setDisplayedEn('');
      setDisplayedCn('');
      setIsTyping(false);
      setIsComplete(false);
      return;
    }

    let enIndex = 0;
    let cnIndex = 0;
    let cancelled = false;

    const typeChar = () => {
      if (cancelled) return;
      
      const enDone = enIndex >= textEn.length;
      const cnDone = cnIndex >= textCn.length;

      if (!enDone || !cnDone) {
        if (!enDone) {
          enIndex++;
          setDisplayedEn(textEn.slice(0, enIndex));
        }
        if (!cnDone) {
          cnIndex++;
          setDisplayedCn(textCn.slice(0, cnIndex));
        }

        const baseDelay = 1000 / speed;
        const variation = baseDelay * jitter * (Math.random() - 0.5) * 2;
        const nextDelay = Math.max(10, baseDelay + variation);

        timeoutRef.current = setTimeout(typeChar, nextDelay);
      } else {
        setIsTyping(false);
        setIsComplete(true);
        onComplete?.();
      }
    };

    const startTyping = () => {
      if (cancelled) return;
      setDisplayedEn('');
      setDisplayedCn('');
      setIsTyping(true);
      setIsComplete(false);
      typeChar();
    };

    if (delay > 0) {
      timeoutRef.current = setTimeout(startTyping, delay);
    } else {
      startTyping();
    }

    return () => {
      cancelled = true;
      clearTimeouts();
    };
  }, [textEn, textCn, speed, delay, jitter, onComplete, clearTimeouts]);

  return {
    displayedEn,
    displayedCn,
    isTyping,
    isComplete,
    skip,
    reset,
  };
}
