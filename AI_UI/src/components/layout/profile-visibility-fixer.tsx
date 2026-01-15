"use client";

import React, { useEffect } from 'react';

export function ProfileVisibilityFixer() {
  useEffect(() => {
     
    const fixOverlayElements = () => {
       
      const chatInputContainer = document.querySelector('.fixed.bottom-0.left-0.right-0.bg-background.z-10');
      if (chatInputContainer instanceof HTMLElement) {
         
        const isSidebarCollapsed = document.body.classList.contains('sidebar-collapsed');
        
         
        if (isSidebarCollapsed) {
          chatInputContainer.style.left = '0';
        } else {
          chatInputContainer.style.left = 'var(--sidebar-width, 280px)';
        }
        
         
        chatInputContainer.style.zIndex = '5';
      }
      
       
      const overlays = document.querySelectorAll('div[style*="position:fixed"][style*="bottom:0"], div[style*="background-color:rgba(0,0,0"], div[style*="background:rgba(0,0,0"]');
      
       
      overlays.forEach(overlay => {
        if (overlay instanceof HTMLElement) {
           
          if (!overlay.classList.contains('fixed') || !overlay.classList.contains('bottom-0')) {
            overlay.style.display = 'none';
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
          }
        }
      });
      
       
      const profileSection = document.querySelector('[data-sidebar="footer"]');
      if (profileSection instanceof HTMLElement) {
        profileSection.style.zIndex = '30';
        profileSection.style.position = 'relative';
        profileSection.style.backgroundColor = 'var(--background)';
        profileSection.style.visibility = 'visible';
        profileSection.style.opacity = '1';
      }
      
       
      const sidebarElement = document.querySelector('[data-sidebar="sidebar"]');
      if (sidebarElement instanceof HTMLElement) {
        sidebarElement.style.display = 'flex';
        sidebarElement.style.flexDirection = 'column';
        sidebarElement.style.backgroundColor = 'var(--background)';
        sidebarElement.style.minHeight = '100%';
      }
      
       
      const contentElement = document.querySelector('[data-sidebar="content"]');
      if (contentElement instanceof HTMLElement) {
        contentElement.style.flex = '1';
        contentElement.style.display = 'flex';
        contentElement.style.flexDirection = 'column';
        contentElement.style.backgroundColor = 'var(--background)';
      }
      
       
      const elementsToCheck = document.querySelectorAll('div[style*="background-color:#000"], div[style*="background:#000"], div[style*="background:black"], div[style*="background-color:black"]');
      elementsToCheck.forEach(element => {
        if (element instanceof HTMLElement) {
           
          const rect = element.getBoundingClientRect();
          const sidebarRect = sidebarElement?.getBoundingClientRect();
          
          if (sidebarRect && rect.top > sidebarRect.height - 200) {
             
            element.style.backgroundColor = 'var(--background)';
            element.style.display = 'none';
          }
        }
      });
    };
    
     
    fixOverlayElements();
    
     
    const observer = new MutationObserver((mutations) => {
      fixOverlayElements();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    return () => observer.disconnect();
  }, []);
  
  return null;  
} 