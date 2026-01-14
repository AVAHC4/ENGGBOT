"use client";

import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { checkExternalAuth } from "@/lib/auth-helpers";

export default function Home() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {

        const authenticated = checkExternalAuth();
        setIsAuthenticated(authenticated);
        setIsLoading(false);

        if (!authenticated) {
            window.location.href = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://localhost:3000/login';
        }
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen p-4 animate-pulse">
                {/* Header skeleton */}
                <div className="flex justify-between items-center mb-6">
                    <div className="h-8 bg-muted rounded w-32" />
                    <div className="h-8 bg-muted rounded-full w-8" />
                </div>
                {/* Chat area skeleton */}
                <div className="flex-1 space-y-4">
                    <div className="flex gap-3">
                        <div className="h-10 w-10 bg-muted rounded-full" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-3/4" />
                            <div className="h-4 bg-muted rounded w-1/2" />
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <div className="space-y-2">
                            <div className="h-4 bg-muted rounded w-48" />
                            <div className="h-4 bg-muted rounded w-32" />
                        </div>
                        <div className="h-10 w-10 bg-muted rounded-full" />
                    </div>
                </div>
                {/* Input skeleton */}
                <div className="mt-4 h-12 bg-muted rounded-xl" />
            </div>
        );
    }

    if (isAuthenticated) {
        return (
            <main className="min-h-screen chat-page overflow-hidden">
                <div className="absolute top-4 right-4 z-10 hidden md:block">

                </div>


                <div className="flex-1">
                    <ChatInterface />
                </div>
            </main>
        );
    }

    return null;
}
