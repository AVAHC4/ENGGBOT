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
      // Check if the user is close to the bottom (within 100px)
      const isNearBottom = scrollHeight - containerRef.current.scrollTop - clientHeight < 100;
      
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
        'flex flex-col h-full overflow-y-auto p-1.5 gap-2 overscroll-none',
        'content-visibility-auto contain-intrinsic-size-auto',
        'pl-4 md:pl-6',
        className
      )}
      style={{ scrollbarGutter: 'stable' }}
      {...props}
    >
      <div className="flex-grow" />
      <div className="max-w-[92%] md:max-w-[85%] mx-auto w-full">
        {children}
      </div>
      <div ref={bottomRef} className="h-1 w-full flex-shrink-0" />
    </div>
  );
}

interface ChatMessageListCompactProps extends React.HTMLAttributes<HTMLDivElement> {
  smooth?: boolean;
  children?: React.ReactNode;
}

const ChatMessageListCompact = React.forwardRef<HTMLDivElement, ChatMessageListCompactProps>(
  ({ className, children, smooth = false, ...props }, ref) => {
    const {
      scrollRef,
      isAtBottom,
      autoScrollEnabled,
      scrollToBottom,
      disableAutoScroll,
    } = useAutoScroll({
      smooth,
      content: children as unknown,
      offset: 100,  // Increase threshold to consider "at bottom"
    });

    return (
      <div className="relative w-full h-full">
        <div
          className={`flex flex-col w-full h-full p-2 overflow-y-auto overscroll-none pl-4 md:pl-6 ${className}`}
          ref={scrollRef}
          onWheel={disableAutoScroll}
          onTouchMove={disableAutoScroll}
          style={{ scrollbarGutter: 'stable' }}
          {...props}
        >
          <div className="flex-grow" />
          <div className="flex flex-col gap-2 max-w-[92%] md:max-w-[85%] mx-auto w-full">
            {children}
          </div>
          <div className="h-1 flex-shrink-0" />
        </div>

        {!isAtBottom && (
          <Button
            onClick={() => {
              scrollToBottom();
            }}
            size="icon"
            variant="outline"
            className="fixed bottom-2 left-1/2 transform -translate-x-1/2 inline-flex rounded-full shadow-md z-10"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }
);

ChatMessageListCompact.displayName = "ChatMessageListCompact";

export { ChatMessageListCompact };
