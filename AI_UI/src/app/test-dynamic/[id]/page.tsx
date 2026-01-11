
import React from 'react';

export const dynamic = 'force-dynamic';

export default function TestPage({ params }: { params: { id: string } }) {
    return (
        <div className="p-10">
            <h1>Test Dynamic Route Check</h1>
            <p>ID: {params.id}</p>
            <p>Timestamp: {new Date().toISOString()}</p>
        </div>
    );
}
