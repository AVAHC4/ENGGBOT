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
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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
