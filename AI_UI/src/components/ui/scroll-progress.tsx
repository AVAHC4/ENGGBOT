'use client'

import { motion, SpringOptions, useScroll, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'
import { RefObject } from 'react'

interface ScrollProgressProps {
  className?: string
  springOptions?: SpringOptions
  containerRef?: RefObject<HTMLDivElement>
}

const DEFAULT_SPRING_OPTIONS: SpringOptions = {
  stiffness: 280,
  damping: 18,
  mass: 0.3,
}

export function ScrollProgress({
  className,
  springOptions,
  containerRef,
}: ScrollProgressProps) {
  const { scrollYProgress } = useScroll({
    container: containerRef,
  })

  const scaleX = useSpring(scrollYProgress, {
    ...(springOptions ?? DEFAULT_SPRING_OPTIONS),
  })

  return (
    <>



      <motion.div
        className={cn(
          'pointer-events-none absolute left-0 right-0 top-0 h-1 w-full origin-left z-50',
          'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500',
          className,
        )}
        style={{
          scaleX,
        }}
      />
    </>
  )
}
