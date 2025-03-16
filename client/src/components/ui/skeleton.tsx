import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import React from "react"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        className
      )}
      {...props}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full"
        animate={{
          transform: ["translateX(-100%)", "translateX(100%)"],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
        }}
      />
    </motion.div>
  )
}

export { Skeleton }