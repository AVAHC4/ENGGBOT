"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion, stagger, useAnimate } from "framer-motion";
import { cn } from "@/lib/utils";

 
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

 
const processTextWithLinks = (text: string): Segment[] => {
   
   
  const linkRegex = /(?:\[([^\]]+)\]\(([^)]+)\))|(?:(https?:\/\/[^\s]+))/g;
  
   
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match;
  
   
  linkRegex.lastIndex = 0;
  
  while ((match = linkRegex.exec(text)) !== null) {
     
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, match.index)
      });
    }
    
     
    if (match[1] && match[2]) {
       
      segments.push({
        type: "link",
        text: match[1],
        url: match[2],
        content: match[0]
      });
    } else if (match[3]) {
       
      segments.push({
        type: "link",
        text: match[3],
        url: match[3],
        content: match[0]
      });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
   
  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      content: text.slice(lastIndex)
    });
  }
  
  return segments;
};

 
const segmentsToElements = (segments: Segment[]): Element[] => {
  const result: Element[] = [];
  
  segments.forEach((segment, segmentIndex) => {
    if (segment.type === "link") {
       
      result.push({
        type: "link",
        text: segment.text,
        url: segment.url,
        content: segment.content,
        key: `link-${segmentIndex}`
      });
    } else {
       
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
        delay: stagger(0.05),  
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
