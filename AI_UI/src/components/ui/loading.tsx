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


export function ProjectCardSkeleton() {
    return (
        <div
            className="flex items-center gap-3 rounded-lg p-3 min-h-[60px] border-l-4 animate-pulse"
            style={{ borderLeftColor: 'rgba(59, 130, 246, 0.3)' }}
        >
            { }
            <div className="h-6 w-6 bg-neutral-200 dark:bg-neutral-700 rounded-md flex-shrink-0" />

            { }
            <div className="flex-1 min-w-0">
                { }
                <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
                    <div className="h-5 w-5 bg-neutral-100 dark:bg-neutral-800 rounded opacity-0" />
                </div>

                { }
                <div className="flex gap-3">
                    <div className="h-3 w-14 bg-neutral-200 dark:bg-neutral-700 rounded" />
                    <div className="h-3 w-12 bg-neutral-200 dark:bg-neutral-700 rounded" />
                </div>
            </div>
        </div>
    );
}

export function ConversationItemSkeleton() {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
            <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
            <div className="flex-1">
                <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
                <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
        </div>
    );
}

export function TeamMemberSkeleton() {
    return (
        <div className="flex items-center gap-3 p-2 animate-pulse">
            <div className="h-10 w-10 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
            <div className="flex-1">
                <div className="h-4 w-28 bg-neutral-200 dark:bg-neutral-700 rounded mb-1" />
                <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
        </div>
    );
}

export function MessageSkeleton() {
    return (
        <div className="flex gap-3 p-4 animate-pulse">
            <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded" />
                <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-700 rounded" />
                <div className="h-4 w-2/3 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
        </div>
    );
}

export function UserMessageSkeleton() {
    return (
        <div className="flex justify-end p-4 animate-pulse">
            <div className="flex gap-3 max-w-[70%]">
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-full bg-neutral-300 dark:bg-neutral-600 rounded" />
                    <div className="h-4 w-3/4 bg-neutral-300 dark:bg-neutral-600 rounded ml-auto" />
                </div>
                <div className="h-8 w-8 bg-neutral-300 dark:bg-neutral-600 rounded-full shrink-0" />
            </div>
        </div>
    );
}

export function AIMessageSkeleton() {
    return (
        <div className="flex justify-start p-4 animate-pulse">
            <div className="flex gap-3 max-w-[85%]">
                <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded" />
                    <div className="h-4 w-4/5 bg-neutral-200 dark:bg-neutral-700 rounded" />
                    <div className="h-4 w-2/3 bg-neutral-200 dark:bg-neutral-700 rounded" />
                </div>
            </div>
        </div>
    );
}

export function ChatConversationSkeleton() {
    return (
        <div className="flex flex-col space-y-2">
            <UserMessageSkeleton />
            <AIMessageSkeleton />
            <UserMessageSkeleton />
            <AIMessageSkeleton />
        </div>
    );
}

export function ChatLoadingAnimation() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
            <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 animate-spin" style={{ animationDuration: '2s' }}>
                    <div className="absolute inset-1 rounded-full bg-background" />
                </div>
                <div className="absolute inset-0 w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 opacity-30 blur-xl animate-pulse" />
            </div>
            <div className="flex flex-col items-center gap-2">
                <p className="text-lg font-medium text-foreground">Loading conversation</p>
                <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    );
}


export function LoadingOverlay({ message }: { message?: string }) {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] z-10 rounded-lg">
            <LoadingSpinner message={message} />
        </div>
    );
}
