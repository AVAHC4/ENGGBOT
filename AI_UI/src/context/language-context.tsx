"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, Language } from '@/lib/translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('en');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
         
        const savedData = localStorage.getItem('user_data');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.language && translations[parsed.language as Language]) {
                    setLanguage(parsed.language as Language);
                }
            } catch (e) {
                console.error("Failed to parse user data for language", e);
            }
        }
        setIsLoaded(true);
    }, []);

    const t = (key: string): string => {
        const langTranslations = translations[language] || translations['en'];
        return langTranslations[key] || key;
    };

    const value = {
        language,
        setLanguage: (lang: Language) => {
            setLanguage(lang);
             
             
             
            const savedData = localStorage.getItem('user_data');
            let currentData = {};
            try {
                currentData = savedData ? JSON.parse(savedData) : {};
            } catch (e) { }

            localStorage.setItem('user_data', JSON.stringify({
                ...currentData,
                language: lang
            }));
        },
        t
    };



    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
