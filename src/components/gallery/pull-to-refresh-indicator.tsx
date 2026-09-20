"use client"

import { motion } from "framer-motion"

interface PullToRefreshIndicatorProps {
  pullDistance: number
  progress: number
  isRefreshing: boolean
}

export function PullToRefreshIndicator({
  pullDistance,
  progress,
  isRefreshing,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null

  return (
    <motion.div
      className="flex justify-center items-center overflow-hidden"
      animate={{ height: pullDistance }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
    >
      <div className="nb nb-sm nb-butter mono inline-flex items-center gap-[9px] px-[11px] py-[7px] text-[0.7rem] uppercase tracking-[0.06em]">
        <motion.span
          className="spin-ring block h-[17px] w-[17px] flex-none border-[2.5px] border-on-fill border-t-transparent"
          animate={{
            rotate: isRefreshing ? 360 : progress * 180,
            scale: isRefreshing ? [1, 1.2, 1] : Math.min(progress, 1),
            opacity: Math.min(progress * 2, 1),
          }}
          transition={
            isRefreshing
              ? {
                  rotate: { repeat: Infinity, duration: 1, ease: "linear" },
                  scale: { repeat: Infinity, duration: 1 },
                }
              : { type: "spring", stiffness: 300, damping: 20 }
          }
        />
        {isRefreshing && <span>Refreshing plates</span>}
      </div>
    </motion.div>
  )
}
