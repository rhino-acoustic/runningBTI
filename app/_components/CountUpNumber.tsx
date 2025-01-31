'use client';
import { useEffect, useState } from 'react';

interface CountUpNumberProps {
    end: number;
    duration?: number;
    className?: string;
}

export const CountUpNumber = ({ end, duration = 1000, className = '' }: CountUpNumberProps) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!end) return;

        let startTimestamp: number;
        // 시작값을 최종값의 70%로 설정
        const startValue = Math.floor(end * 0.7);
        setCount(startValue);
        
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            // easeOutQuart 이징 함수 적용
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(startValue + easeOutQuart * (end - startValue)));
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        
        window.requestAnimationFrame(step);
    }, [end, duration]);

    return <span className={className}>{count.toLocaleString()}</span>;
}; 