"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion, stagger, useAnimate } from "framer-motion";
import { cn } from "@/lib/utils";

// Define types for our segments and elements
type TextSegment = {
  type: "text";
  content: string;
};

type LinkSegment = {
  type: "link";
  text: string;
  url: string;
  content: string;
};

type Segment = TextSegment | LinkSegment;

type TextElement = {
  type: "text";
  content: string;
  key: string;
};

type LinkElement = {
  type: "link";
  text: string;
  url: string;
  content: string;
  key: string;
};

type Element = TextElement | LinkElement;

// Function to process text with links
const processTextWithLinks = (text: string): Segment[] => {
  // Regular expression for both direct URLs and markdown links
  // This captures: [text](url) format or direct https://... URLs
  const linkRegex = /(?:\[([^\]]+)\]\(([^)]+)\))|(?:(https?:\/\/[^\s]+))/g;
  
  // Split the text into segments (text and links)
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match;
  
  // Reset regex state
  linkRegex.lastIndex = 0;
  
  while ((match = linkRegex.exec(text)) !== null) {
    // If there's text before the link, add it
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, match.index)
      });
    }
    
    // Check which type of link we found
    if (match[1] && match[2]) {
      // Markdown link: [text](url)
      segments.push({
        type: "link",
        text: match[1],
        url: match[2],
        content: match[0]
      });
    } else if (match[3]) {
      // Direct URL: https://...
      segments.push({
        type: "link",
        text: match[3],
        url: match[3],
        content: match[0]
      });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add any remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      content: text.slice(lastIndex)
    });
  }
  
  return segments;
};

// Convert segments to elements for animation
const segmentsToElements = (segments: Segment[]): Element[] => {
  const result: Element[] = [];
  
  segments.forEach((segment, segmentIndex) => {
    if (segment.type === "link") {
      // Add link as a single element
      result.push({
        type: "link",
        text: segment.text,
        url: segment.url,
        content: segment.content,
        key: `link-${segmentIndex}`
      });
    } else {
      // Split text by spaces into words
      const words = segment.content.split(/\s+/).filter(Boolean);
      words.forEach((word, wordIndex) => {
        result.push({
          type: "text",
          content: word,
          key: `text-${segmentIndex}-${wordIndex}`
        });
      });
    }
  });
  
  return result;
};

export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.5,
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
}) => {
  const [scope, animate] = useAnimate();
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  
  const segments = useMemo(() => processTextWithLinks(words), [words]);
  const elements = useMemo(() => segmentsToElements(segments), [segments]);
  
  useEffect(() => {
    const controls = animate(
      "span",
      {
        opacity: 1,
        filter: filter ? "blur(0px)" : "none",
      },
      {
        duration: duration,
        delay: stagger(0.05), // Faster animation
        onComplete: () => {
          setIsAnimationComplete(true);
        }
      }
    );
    
    return () => controls.stop();
  }, [animate, filter, duration, elements]);

  return (
    <div className={cn("font-normal", className)}>
      <motion.div ref={scope} className="inline-block">
        {elements.map((element, index) => (
          <React.Fragment key={element.key}>
            {element.type === "link" ? (
              // Handle links
              <motion.span
                className="opacity-0"
                style={{ filter: filter ? "blur(8px)" : "none" }}
              >
                {isAnimationComplete ? (
                  <a 
                    href={element.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {element.text}
                  </a>
                ) : (
                  <span className="text-blue-600">{element.text}</span>
                )}
                {" "}
              </motion.span>
            ) : (
              // Handle regular text
              <motion.span
                className="opacity-0"
                style={{ filter: filter ? "blur(8px)" : "none" }}
              >
                {element.content}{" "}
              </motion.span>
            )}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
};
