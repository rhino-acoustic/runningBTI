'use client';
import React from 'react';

interface ProgressGaugeProps {
    current: number;
    total: number;
}

export const ProgressGauge = ({ current, total }: ProgressGaugeProps) => {
    const progress = (current / total) * 100;

    return (
        <div className="pt-6 pb-2 relative" data-oid="gauge-container">
            <div className="w-full bg-white/50 h-2 rounded-full overflow-hidden" data-oid="1tj6-qq">
                <div
                    className="h-full bg-gradient-to-r from-[#004D40] to-[#00695C] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                    data-oid="fenim1i"
                />
            </div>
            <div
                className="absolute text-base animate-bounce"
                style={{
                    right: `${100 - progress}%`,
                    top: '4px',
                    transform: 'translateX(50%)',
                }}
                data-oid="7hwzc2y"
            >
                <span
                    style={{ display: 'inline-block', transform: 'scaleX(-1)' }}
                    data-oid="n_ctlkj"
                >
                    🏃‍♂️
                </span>
            </div>
        </div>
    );
};
