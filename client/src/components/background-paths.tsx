"use client"

import React from "react"

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
        <g opacity="0.4">
          {/* Main arcs */}
          <path
            d="M-100,900 Q720,850 1540,900"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          <path
            d="M-100,900 Q620,700 1540,900"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          <path
            d="M-100,900 Q520,550 1540,900"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          <path
            d="M-100,900 Q420,400 1540,900"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          <path
            d="M-100,900 Q320,250 1540,900"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          <path
            d="M-100,900 Q220,100 1540,900"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          
          {/* Additional arcs for the dense effect */}
          <path d="M-100,900 Q150,50 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q147,55 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q144,60 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q141,65 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q138,70 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q135,75 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q132,80 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q129,85 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q126,90 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q123,95 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q120,100 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q117,105 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q114,110 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q111,115 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q108,120 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q105,125 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q102,130 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q99,135 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q96,140 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,900 Q93,145 1540,900" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
        </g>
      </svg>
    </div>
  )
}

export default BackgroundPaths 