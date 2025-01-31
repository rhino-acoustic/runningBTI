'use client';
import React from 'react';

export default function TestLayout({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="mobile-container"
            style={{
                maxWidth: 720,
                margin: '0 auto',
                boxShadow: '0 0 15px rgba(0,0,0,0.1)',
            }}
            data-oid="w1rotoe"
        >
            <main className="h-screen" data-oid="qkijfga">
                <div className="h-screen bg-[#F1E9DB] px-0 pl-0" data-oid="ejaygog">
                    {children}
                </div>
            </main>
        </div>
    );
}
