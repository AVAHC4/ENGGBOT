'use client';

import React from 'react';

export default function ProjectLoading() {
    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto px-4 py-8 animate-pulse">
            <div className="flex items-center gap-4 mb-8">
                <div className="h-10 w-10 bg-white/10 rounded" />
                <div className="h-8 w-8 bg-white/10 rounded" />
                <div className="h-8 bg-white/10 rounded w-48" />
            </div>
            <div className="h-14 bg-white/10 rounded-xl mb-6" />
            <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-lg">
                        <div className="h-5 w-5 bg-white/10 rounded" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-white/10 rounded w-32" />
                            <div className="h-3 bg-white/10 rounded w-20" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
