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
      {/* Base track line */}
      <div
        className={cn(
          'pointer-events-none absolute left-0 right-0 top-0 h-0.5 w-full',
          'bg-transparent dark:bg-[#111111]',
        )}
        aria-hidden
      />
      {/* Animated progress overlay */}
      <motion.div
        className={cn(
          'pointer-events-none absolute left-0 right-0 top-0 h-0.5 w-full origin-left',
          'bg-[linear-gradient(to_right,rgba(0,0,0,0),#111111_75%,#111111_100%)]',
          'dark:bg-[linear-gradient(to_right,rgba(255,255,255,0),#ffffff_75%,#ffffff_100%)]',
          className,
        )}
        style={{
          scaleX,
        }}
      />
    </>
  )
}
