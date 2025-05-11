"use client";

import React, { useEffect } from 'react';

export function ProfileVisibilityFixer() {
  useEffect(() => {
    // Function to find and fix any black element covering the profile section
    const fixOverlayElements = () => {
      // Find and fix the chat input at the bottom of the page
      const chatInputContainer = document.querySelector('.fixed.bottom-0.left-0.right-0.bg-background.z-10');
      if (chatInputContainer instanceof HTMLElement) {
        // Check if sidebar is collapsed
        const isSidebarCollapsed = document.body.classList.contains('sidebar-collapsed');
        
        // Set the left position based on sidebar state
        if (isSidebarCollapsed) {
          chatInputContainer.style.left = '0';
        } else {
          chatInputContainer.style.left = 'var(--sidebar-width, 280px)';
        }
        
        // Lower the z-index
        chatInputContainer.style.zIndex = '5';
      }
      
      // Find potential overlay elements that might be covering the profile
      const overlays = document.querySelectorAll('div[style*="position:fixed"][style*="bottom:0"], div[style*="background-color:rgba(0,0,0"], div[style*="background:rgba(0,0,0"]');
      
      // Remove or adjust these elements
      overlays.forEach(overlay => {
        if (overlay instanceof HTMLElement) {
          // Don't hide the chat input container completely
          if (!overlay.classList.contains('fixed') || !overlay.classList.contains('bottom-0')) {
            overlay.style.display = 'none';
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
          }
        }
      });
      
      // Ensure the profile section is visible
      const profileSection = document.querySelector('[data-sidebar="footer"]');
      if (profileSection instanceof HTMLElement) {
        profileSection.style.zIndex = '30';
        profileSection.style.position = 'relative';
        profileSection.style.backgroundColor = 'var(--background)';
        profileSection.style.visibility = 'visible';
        profileSection.style.opacity = '1';
      }
      
      // Fix the black space by ensuring proper layout
      const sidebarElement = document.querySelector('[data-sidebar="sidebar"]');
      if (sidebarElement instanceof HTMLElement) {
        sidebarElement.style.display = 'flex';
        sidebarElement.style.flexDirection = 'column';
        sidebarElement.style.backgroundColor = 'var(--background)';
        sidebarElement.style.minHeight = '100%';
      }
      
      // Ensure content takes up proper space
      const contentElement = document.querySelector('[data-sidebar="content"]');
      if (contentElement instanceof HTMLElement) {
        contentElement.style.flex = '1';
        contentElement.style.display = 'flex';
        contentElement.style.flexDirection = 'column';
        contentElement.style.backgroundColor = 'var(--background)';
      }
      
      // Fix any specific element with a black background that might be at the bottom
      const elementsToCheck = document.querySelectorAll('div[style*="background-color:#000"], div[style*="background:#000"], div[style*="background:black"], div[style*="background-color:black"]');
      elementsToCheck.forEach(element => {
        if (element instanceof HTMLElement) {
          // Check if this element is in the sidebar area and near the bottom
          const rect = element.getBoundingClientRect();
          const sidebarRect = sidebarElement?.getBoundingClientRect();
          
          if (sidebarRect && rect.top > sidebarRect.height - 200) {
            // This is likely our culprit - the black space at the bottom
            element.style.backgroundColor = 'var(--background)';
            element.style.display = 'none';
          }
        }
      });
    };
    
    // Run immediately
    fixOverlayElements();
    
    // And set up a mutation observer to handle dynamically added elements
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
  
  return null; // This component doesn't render anything
} 