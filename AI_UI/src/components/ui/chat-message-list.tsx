import React, { useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoScroll } from "@/hooks/use-auto-scroll";

interface ChatMessageListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  smooth?: boolean;
}

export function ChatMessageList({
  children,
  className,
  smooth = false,
  ...props
}: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useLayoutEffect(() => {
    if (containerRef.current && bottomRef.current) {
      // Get the container's scroll height and client height
      const { scrollHeight, clientHeight } = containerRef.current;
      // Check if the user is close to the bottom
      const isNearBottom = scrollHeight - containerRef.current.scrollTop - clientHeight < 300;
      
      // Only auto-scroll if near bottom or if no scrollbar
      if (isNearBottom || scrollHeight <= clientHeight) {
        bottomRef.current.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'end',
        });
      }
    }
  }, [children, smooth]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        'flex flex-col h-full overflow-y-auto p-1.5 gap-2',
        className
      )}
      {...props}
    >
      {children}
      <div ref={bottomRef} className="h-0 w-full" />
    </div>
  );
}

interface ChatMessageListCompactProps extends React.HTMLAttributes<HTMLDivElement> {
  smooth?: boolean;
  children?: React.ReactNode;
}

function ChatMessageListCompact({ className, children, smooth = false, ...props }: ChatMessageListCompactProps) {
  const {
    scrollRef,
    isAtBottom,
    scrollToBottom,
    disableAutoScroll,
  } = useAutoScroll({
    smooth,
    content: children as unknown,
  });

  return (
    <div className="relative w-full h-full">
      <div
        className={`flex flex-col w-full h-full p-2 overflow-y-auto ${className}`}
        ref={scrollRef}
        onWheel={disableAutoScroll}
        onTouchMove={disableAutoScroll}
        {...props}
      >
        <div className="flex flex-col gap-2">{children}</div>
      </div>

      {!isAtBottom && (
        <div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center">
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollToBottom();
            }}
            size="icon"
            variant="outline"
            className="pointer-events-auto z-20 inline-flex rounded-full shadow-md"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export { ChatMessageListCompact };
