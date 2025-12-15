"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg" | "xl";
    message?: string;
    className?: string;
    fullScreen?: boolean;
}

const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
    xl: "h-16 w-16 border-4",
};

export function LoadingSpinner({
    size = "md",
    message,
    className,
    fullScreen = false,
}: LoadingSpinnerProps) {
    const spinner = (
        <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
            <div
                className={cn(
                    "animate-spin rounded-full border-primary border-t-transparent",
                    sizeClasses[size]
                )}
            />
            {message && (
                <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
                {spinner}
            </div>
        );
    }

    return spinner;
}

// Skeleton loaders for different content types
export function ProjectCardSkeleton() {
    return (
        <div className="rounded-lg border bg-card p-4 animate-pulse">
            <div className="flex items-start justify-between mb-3">
                <div className="h-6 w-32 bg-muted rounded" />
                <div className="h-4 w-4 bg-muted rounded" />
            </div>
            <div className="h-4 w-full bg-muted rounded mb-2" />
            <div className="h-4 w-2/3 bg-muted rounded mb-4" />
            <div className="flex gap-2">
                <div className="h-6 w-16 bg-muted rounded-full" />
                <div className="h-6 w-16 bg-muted rounded-full" />
            </div>
        </div>
    );
}

export function ConversationItemSkeleton() {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
            <div className="h-8 w-8 bg-muted rounded-full" />
            <div className="flex-1">
                <div className="h-4 w-24 bg-muted rounded mb-2" />
                <div className="h-3 w-32 bg-muted rounded" />
            </div>
        </div>
    );
}

export function TeamMemberSkeleton() {
    return (
        <div className="flex items-center gap-3 p-2 animate-pulse">
            <div className="h-10 w-10 bg-muted rounded-full" />
            <div className="flex-1">
                <div className="h-4 w-28 bg-muted rounded mb-1" />
                <div className="h-3 w-20 bg-muted rounded" />
            </div>
        </div>
    );
}

export function MessageSkeleton() {
    return (
        <div className="flex gap-3 p-4 animate-pulse">
            <div className="h-8 w-8 bg-muted rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
                <div className="h-4 w-2/3 bg-muted rounded" />
            </div>
        </div>
    );
}

// Loading overlay for inline loading states
export function LoadingOverlay({ message }: { message?: string }) {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] z-10 rounded-lg">
            <LoadingSpinner message={message} />
        </div>
    );
}
