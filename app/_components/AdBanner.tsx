'use client';
import React from 'react';
import Image from 'next/image';

interface AdBannerProps {
    imageUrl: string;
    landingUrl: string;
}

const recordAdClick = () => {
    console.log('광고 클릭');
    // 여기에 클릭 추적 로직 추가
};

export default function AdBanner({ imageUrl, landingUrl }: AdBannerProps) {
    return (
        <a
            href={landingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ad-banner block"
            onClick={() => recordAdClick()}
            data-oid="d-ko03q"
        >
            <Image
                src={imageUrl}
                alt="광고"
                width={374}
                height={100}
                className="w-full h-full object-cover"
                data-oid="1cyufyc"
                priority={true}
            />
        </a>
    );
}
