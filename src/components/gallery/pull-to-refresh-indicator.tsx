'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  progress: number;
  isRefreshing: boolean;
}

export function PullToRefreshIndicator({
  pullDistance,
  progress,
  isRefreshing,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <motion.div
      className="flex justify-center items-center overflow-hidden"
      animate={{ height: pullDistance }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
    >
      <motion.div
        animate={{
          rotate: isRefreshing ? 360 : progress * 180,
          scale: isRefreshing ? [1, 1.2, 1] : Math.min(progress, 1),
          opacity: Math.min(progress * 2, 1),
        }}
        transition={
          isRefreshing
            ? { rotate: { repeat: Infinity, duration: 1, ease: 'linear' }, scale: { repeat: Infinity, duration: 1 } }
            : { type: 'spring', stiffness: 300, damping: 20 }
        }
        className="w-8 h-8"
      >
        <Image
          src="/logo.svg"
          alt=""
          width={32}
          height={32}
          className="w-full h-full"
          style={{ filter: 'var(--logo-filter, none)' }}
        />
      </motion.div>
    </motion.div>
  );
}
