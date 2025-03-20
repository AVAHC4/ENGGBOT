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
          {/* Main arcs from bottom */}
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
          
          {/* Additional arcs for the dense effect from bottom */}
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
          
          {/* Main arcs from top */}
          <path
            d="M-100,0 Q720,50 1540,0"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          <path
            d="M-100,0 Q620,200 1540,0"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          <path
            d="M-100,0 Q520,350 1540,0"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          <path
            d="M-100,0 Q420,500 1540,0"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          <path
            d="M-100,0 Q320,650 1540,0"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          <path
            d="M-100,0 Q220,800 1540,0"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          
          {/* Additional arcs for the dense effect from top */}
          <path d="M-100,0 Q150,850 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q147,845 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q144,840 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q141,835 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q138,830 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q135,825 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q132,820 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q129,815 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q126,810 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q123,805 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q120,800 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q117,795 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q114,790 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q111,785 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q108,780 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q105,775 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q102,770 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q99,765 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q96,760 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
          <path d="M-100,0 Q93,755 1540,0" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
        </g>
      </svg>
    </div>
  )
}

export default BackgroundPaths 