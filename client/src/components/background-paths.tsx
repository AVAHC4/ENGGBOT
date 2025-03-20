"use client"

import React from "react"
import { motion } from "framer-motion"

const BackgroundPaths: React.FC = () => {
  return (
    <div 
      className="absolute inset-0 overflow-hidden" 
      style={{ 
        backgroundColor: 'white',
        zIndex: -5,
        position: 'absolute'
      }}
    >
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 1440 900" 
        preserveAspectRatio="xMinYMin slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="fadeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d1d5db" stopOpacity="0" />
            <stop offset="20%" stopColor="#d1d5db" stopOpacity="1" />
            <stop offset="80%" stopColor="#d1d5db" stopOpacity="1" />
            <stop offset="100%" stopColor="#d1d5db" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g opacity="0.4">
          {/* Bottom rays */}
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.path
              key={`bottom-main-${i}`}
              d={`M-100,900 Q${720 - i * 100},${850 - i * 150} 1540,900`}
              fill="none"
              stroke="url(#fadeGradient)"
              strokeWidth="1"
              animate={{ 
                y: [0, -2, 0, 2, 0],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ 
                duration: 8 + i * 0.5, 
                ease: "easeInOut", 
                repeat: Infinity,
                times: [0, 0.25, 0.5, 0.75, 1] 
              }}
            />
          ))}
          
          {/* Additional arcs for the dense effect from bottom */}
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.path
              key={`bottom-${i}`}
              d={`M-100,900 Q${150 - i * 3},${50 + i * 4} 1540,900`}
              fill="none"
              stroke="url(#fadeGradient)"
              strokeWidth="0.5"
              animate={{ 
                y: [0, -1, 0, 1, 0],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{ 
                duration: 10 + i * 0.2, 
                ease: "easeInOut", 
                repeat: Infinity,
                times: [0, 0.25, 0.5, 0.75, 1],
                delay: i * 0.1
              }}
            />
          ))}
          
          {/* Top rays */}
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.path
              key={`top-main-${i}`}
              d={`M-100,0 Q${720 - i * 100},${50 + i * 150} 1540,0`}
              fill="none"
              stroke="url(#fadeGradient)"
              strokeWidth="1"
              animate={{ 
                y: [0, 2, 0, -2, 0],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ 
                duration: 8 + i * 0.5, 
                ease: "easeInOut", 
                repeat: Infinity,
                times: [0, 0.25, 0.5, 0.75, 1] 
              }}
            />
          ))}
          
          {/* Additional arcs for the dense effect from top */}
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.path
              key={`top-${i}`}
              d={`M-100,0 Q${150 - i * 3},${850 - i * 4} 1540,0`}
              fill="none"
              stroke="url(#fadeGradient)"
              strokeWidth="0.5"
              animate={{ 
                y: [0, 1, 0, -1, 0],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{ 
                duration: 10 + i * 0.2, 
                ease: "easeInOut", 
                repeat: Infinity,
                times: [0, 0.25, 0.5, 0.75, 1],
                delay: i * 0.1
              }}
            />
          ))}
          
          {/* New rays from right side */}
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.path
              key={`right-main-${i}`}
              d={`M1540,${450 - i * 50} Q${1200 - i * 50},${600 - i * 50} ${800 - i * 50},${700 - i * 50}`}
              fill="none"
              stroke="url(#fadeGradient)"
              strokeWidth="1"
              animate={{ 
                x: [0, -2, 0, 2, 0],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ 
                duration: 8 + i * 0.5, 
                ease: "easeInOut", 
                repeat: Infinity,
                times: [0, 0.25, 0.5, 0.75, 1] 
              }}
            />
          ))}
          
          {/* Additional rays from right side */}
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.path
              key={`right-${i}`}
              d={`M1540,${200 - i * 10} Q${950 - i * 5},${350 - i * 5} ${550 - i * 10},${450 - i * 10}`}
              fill="none"
              stroke="url(#fadeGradient)"
              strokeWidth="0.5"
              animate={{ 
                x: [0, -1, 0, 1, 0],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{ 
                duration: 10 + i * 0.2, 
                ease: "easeInOut", 
                repeat: Infinity,
                times: [0, 0.25, 0.5, 0.75, 1],
                delay: i * 0.1
              }}
            />
          ))}

          {/* NEW: Additional rays from right-top side */}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.path
              key={`right-top-${i}`}
              d={`M1540,${180 - i * 15} Q${900 - i * 10},${300 - i * 15} ${500 - i * 12},${350 - i * 12}`}
              fill="none"
              stroke="url(#fadeGradient)"
              strokeWidth="0.5"
              animate={{ 
                x: [0, -1.5, 0, 1.5, 0],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{ 
                duration: 9 + i * 0.3, 
                ease: "easeInOut", 
                repeat: Infinity,
                times: [0, 0.25, 0.5, 0.75, 1],
                delay: i * 0.15
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}

export default BackgroundPaths 