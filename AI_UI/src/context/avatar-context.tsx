"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";

interface AvatarContextValue {
    avatar: string;
    setAvatar: (avatar: string) => void;
}

const STORAGE_KEY = "user_avatar";

function getUserEmail(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const userData = localStorage.getItem('user_data');
        if (userData) {
            const parsed = JSON.parse(userData);
            return parsed.email || null;
        }
        return localStorage.getItem('user_email') || null;
    } catch {
        return null;
    }
}

const AvatarContext = createContext<AvatarContextValue | undefined>(undefined);

export function AvatarProvider({ children }: { children: React.ReactNode }) {
    const [avatar, setAvatarState] = useState<string>("");
    const hasLoadedFromStorage = useRef(false);
    const initialLocalStorageValue = useRef<string | null>(null);

    useEffect(() => {
        if (hasLoadedFromStorage.current) return;
        hasLoadedFromStorage.current = true;

        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            initialLocalStorageValue.current = saved;

            if (saved) {
                setAvatarState(saved);
            } else {
                const userData = localStorage.getItem('user_data');
                if (userData) {
                    const parsed = JSON.parse(userData);
                    if (parsed.avatar) {
                        setAvatarState(parsed.avatar);
                    }
                }
            }
        } catch { }
    }, []);

    useEffect(() => {
        if (!hasLoadedFromStorage.current) return;

        const syncWithDatabase = async () => {
            const email = getUserEmail();
            if (!email) return;

            try {
                const response = await fetch(`/api/settings?email=${encodeURIComponent(email)}`);
                if (response.ok) {
                    const { settings } = await response.json();
                    if (settings?.avatar) {
                        setAvatarState(settings.avatar);
                        localStorage.setItem(STORAGE_KEY, settings.avatar);
                        try {
                            const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
                            userData.avatar = settings.avatar;
                            localStorage.setItem('user_data', JSON.stringify(userData));
                        } catch { }
                    }
                }
            } catch (e) {
                console.error("Failed to load avatar from database:", e);
            }
        };

        const timer = setTimeout(syncWithDatabase, 100);
        return () => clearTimeout(timer);
    }, []);

    const saveToDatabase = useCallback(async (avatarValue: string) => {
        const email = getUserEmail();
        if (!email) return;

        try {
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    avatar: avatarValue,
                }),
            });
        } catch (e) {
            console.error("Failed to save avatar to database:", e);
        }
    }, []);

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const setAvatar = useCallback((avatarValue: string) => {
        setAvatarState(avatarValue);

        try {
            if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEY, avatarValue);
                const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
                userData.avatar = avatarValue;
                localStorage.setItem('user_data', JSON.stringify(userData));
                window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
            }
        } catch { }

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            saveToDatabase(avatarValue);
        }, 300);
    }, [saveToDatabase]);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const value: AvatarContextValue = useMemo(
        () => ({ avatar, setAvatar }),
        [avatar, setAvatar],
    );

    return <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>;
}

export function useAvatar() {
    const ctx = useContext(AvatarContext);
    if (!ctx) throw new Error("useAvatar must be used within an AvatarProvider");
    return ctx;
}
