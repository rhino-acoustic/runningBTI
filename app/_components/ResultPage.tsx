'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { CountUpNumber } from './CountUpNumber';
import Image from 'next/image';
import { SaveIcon, ShareIcon, RestartIcon } from '../../components/Icons';
import { ResultCard } from './ResultCard';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';

// 불필요한 타입 선언과 컴포넌트 제거
interface ResultProps {
    testTitle: string;
    result: {
        type: string;
        title: string;
        description: string;
        categories: Array<{
            title: string;
            items: string[];
        }>;
    };
    bottomImage?: {
        image_url: string;
        landing_url: string;
    };
    analytics: {
        participants: number;
        shares: number;
    };
    onRestart: () => void;
    userName?: string;
}

export function ResultPage({
    testTitle,
    result,
    bottomImage,
    analytics,
    onRestart,
    userName,
}: ResultProps) {
    // 결과 이미지 저장
    const handleSave = async () => {
        const element = document.querySelector('.result-capture-area') as HTMLElement;
        if (!element) return;

        try {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

            const canvas = await html2canvas(element, {
                backgroundColor: '#FFFFFF',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                onclone: (clonedDoc) => {
                    const images = clonedDoc.getElementsByTagName('img');
                    Array.from(images).forEach(img => {
                        if (img.src.startsWith('/')) {
                            img.src = window.location.origin + img.src;
                        }
                        
                        if (img.alt === "Advertisement") {
                            const container = img.parentElement?.parentElement;
                            if (container) {
                                container.style.width = '100%';
                                container.style.height = '100px';
                                container.style.display = 'flex';
                                container.style.alignItems = 'center';
                                container.style.justifyContent = 'center';
                                container.style.padding = '0';
                                container.style.margin = '0';
                                container.style.marginBottom = '1rem';
                                container.style.backgroundColor = 'white';
                            }
                            img.style.width = '448px';
                            img.style.height = '100px';
                            img.style.objectFit = 'contain';
                        } else if (img.alt === "Vegavery Logo") {
                            const container = img.parentElement;
                            if (container) {
                                container.style.width = '100px';
                                container.style.height = '30px';
                                container.style.display = 'flex';
                                container.style.alignItems = 'center';
                                container.style.justifyContent = 'center';
                            }
                            img.style.maxWidth = '100px';
                            img.style.height = 'auto';
                            img.style.objectFit = 'contain';
                        }
                    });
                }
            });

            // 이미지 데이터 URL 생성
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            
            // 다운로드 링크 생성
            const link = document.createElement('a');
            link.download = `${result.type}_result.png`;
            link.href = dataUrl;
            
            // iOS Safari를 위한 특별 처리
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
            }
            
            // 링크 클릭
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('이미지 저장 실패:', error);
            alert('이미지 저장에 실패했습니다.');
        }
    };

    // 결과 공유
    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: '테스트 결과',
                    text: result.description,
                    url: window.location.href,
                });
            } else {
                // 공유 API를 지원하지 않는 경우
                await navigator.clipboard.writeText(window.location.href);
                alert('링크가 복사되었습니다');
            }
        } catch (error) {
            console.error('공유 실패:', error);
            alert('공유에 실패했습니다');
        }
    };

    const ResultSection = ({ title, items }: { title: string; items: string[] }) => {
        return (
            <div
                className="mb-0.5 text-center bg-white/90 rounded-lg shadow-sm p-1"
                data-oid="is8no6r"
            >
                <h3 className="text-lg font-bold mb-0" data-oid="nla_hu5">
                    {title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed" data-oid="_erhqjr">
                    {items.join(' • ')}
                </p>
            </div>
        );
    };

    // 배너 이미지 컴포넌트 수정
    const BannerImage = ({ image }: { image: { image_url: string; landing_url: string } }) => {
        return (
            <div className="relative w-full h-[100px]">
                <Image
                    src={image.image_url}
                    alt="Advertisement"
                    fill
                    className="object-contain"
                    sizes="(max-width: 448px) 100vw, 448px"
                    priority
                    unoptimized
                />
            </div>
        );
    };

    return (
        <div className="w-full overflow-x-hidden">
            <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#F1E9DB] to-[#E5D9C3]">
                {/* 화면에 보이는 영역 */}
                <div className="w-full bg-white max-w-[448px] mx-auto p-4 result-capture-area">
                    <div className="w-full">
                        {/* 제목 */}
                        <h1 className="text-2xl font-bold text-center text-[#004D40] mb-6">
                            {testTitle}
                        </h1>

                        {/* 결과 내용 */}
                        <div className="text-center mb-6">
                            <h2 className="type-title font-bold text-2xl mb-1">
                                {userName ? (
                                    <span className="inline">
                                        <span className="text-[#004D40]">{userName}</span>
                                        <span className="mx-1">님은</span>
                                    </span>
                                ) : null}
                                <span>{result.type} {result.title}</span>
                            </h2>
                            <p className="description text-lg mb-0">
                                {result.description}
                            </p>
                        </div>
                        
                        {/* 특성 목록 */}
                        <div className="characteristics mb-4">
                            <div className="characteristic-group">
                                <div className="space-y-1">
                                    {result.categories.map((category, index) => (
                                        <ResultSection
                                            key={index}
                                            title={category.title}
                                            items={category.items}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 하단 배너 */}
                        {bottomImage && (
                            <div className="w-full h-[100px] bg-white">
                                <div className="relative w-full h-full">
                                    <Image
                                        src={bottomImage.image_url}
                                        alt="Advertisement"
                                        fill
                                        className="object-contain"
                                        unoptimized
                                        priority
                                    />
                                </div>
                            </div>
                        )}

                        {/* 로고 */}
                        <div className="flex justify-center">
                            <div className="relative w-[100px] h-[30px]">
                                <Image
                                    src="/logo/bk.png"
                                    alt="Vegavery Logo"
                                    fill
                                    className="object-contain"
                                    unoptimized
                                    priority
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 버튼 영역 */}
                <div className="fixed bottom-0 left-0 right-0">
                    <div className="w-full max-w-[448px] mx-auto bg-gradient-to-b from-[#F1E9DB] to-[#E5D9C3]">
                        <div className="px-4 py-3">
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={handleSave}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-[#004D40] border border-[#004D40] rounded hover:bg-[#004D40] hover:text-white transition-all"
                                >
                                    <SaveIcon className="w-5 h-5" />
                                    <span>저장</span>
                                </button>
                                <button
                                    onClick={handleShare}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#004D40] text-white rounded hover:bg-opacity-90 transition-all"
                                >
                                    <ShareIcon className="w-5 h-5" />
                                    <span>공유</span>
                                </button>
                                <button
                                    onClick={onRestart}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-[#8D6E63] border border-[#8D6E63] rounded hover:bg-[#8D6E63] hover:text-white transition-all"
                                >
                                    <RestartIcon className="w-5 h-5" />
                                    <span>다시하기</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 스타일 추가
<style jsx>{`
    .result-container {
        width: 100%;
        max-width: 448px;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem;
    }
    .with-image {
        gap: 1.5rem;
    }
    .no-image {
        gap: 0.5rem;
    }
    .image-section {
        width: 100%;
        margin-bottom: 1.5rem;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 120px;
    }
    .type-title {
        color: #004d40;
        font-weight: 700;
    }
    .description {
        color: #004d40;
        line-height: 1.6;
    }
    .characteristics {
        width: 100%;
        padding: 0 1rem;
    }
    .characteristic-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .characteristic-line {
        color: #8d6e63;
        padding: 0.5rem 0;
        line-height: 1.5;
    }
    .user-summary {
        text-align: center;
        font-weight: bold;
        color: #004d40;
    }
    .test-title {
        color: #004d40;
        font-weight: 700;
        max-width: 448px;
        word-break: keep-all;
    }
`}</style>;
