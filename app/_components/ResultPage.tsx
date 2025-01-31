'use client';
import React, { useState, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { CountUpNumber } from './CountUpNumber';
import Image from 'next/image';
import { SaveIcon, ShareIcon, RestartIcon } from '../../components/Icons';

// 이미지 관련 인터페이스 제거
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
        try {
            const element = document.getElementById('capture-area');
            if (!element) return;

            const canvas = await html2canvas(element, {
                backgroundColor: '#ffffff',
                scale: 2,
            });

            // Canvas를 이미지로 변환
            const image = canvas.toDataURL('image/png');
            
            // 다운로드 링크 생성 및 클릭
            const link = document.createElement('a');
            link.href = image;
            link.download = `${result.type}_result.png`;
            link.click();
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

    return (
        <div className="w-full overflow-x-hidden animate-fade-in">
            <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#F1E9DB] to-[#E5D9C3]">
                {/* 캡처될 영역 */}
                <div id="capture-area" className="bg-white w-full max-w-[448px] mx-auto relative">
                    {/* 워터마크 로고 패턴 */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
                        <div className="absolute inset-[-50%] w-[200%] h-[200%]">
                            <div 
                                className="w-full h-full" 
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(12, 1fr)',
                                    gap: '50px 40px',
                                    transform: 'rotate(-20deg)',
                                    padding: '20px',
                                    position: 'relative',
                                    left: '-20%',
                                    top: '-10%'
                                }}
                            >
                                {[...Array(60)].map((_, i) => (
                                    <div 
                                        key={i} 
                                        className="flex items-center justify-center"
                                        style={{
                                            transform: `translateX(${i % 2 * 20}px)`
                                        }}
                                    >
                                        <div className="relative w-[60px] h-[18px]">
                                            <Image
                                                src="/logo/bk.png"
                                                alt=""
                                                fill
                                                className="opacity-[0.035]"
                                                style={{
                                                    objectFit: 'contain',
                                                    filter: 'grayscale(100%)'
                                                }}
                                                priority
                                                unoptimized
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 기존 컨텐츠 */}
                    <div className="flex flex-col items-center px-4 pt-4 relative z-10">
                        <h1 className="test-title text-2xl font-bold mb-6 text-center">
                            {testTitle}
                        </h1>

                        <div className="result-container">
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
                        </div>

                        {/* 하단 배너 */}
                        <div className="h-[100px] bg-white mb-2 max-w-md mx-auto">
                            {bottomImage && (
                                <a
                                    href={bottomImage.landing_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block h-full"
                                >
                                    <Image
                                        src={bottomImage.image_url}
                                        alt="Advertisement"
                                        width={448}
                                        height={100}
                                        className="w-full h-full object-contain"  // cover 대신 contain 사용
                                        priority
                                    />
                                </a>
                            )}
                        </div>

                        {/* 로고 추가 */}
                        <div className="flex justify-center items-center mb-4">
                            <a
                                href="https://vegavery.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                <Image
                                    src="/logo/bk.png"
                                    alt="Vegavery Logo"
                                    width={100}
                                    height={30}
                                    className="h-auto"
                                />
                            </a>
                        </div>
                    </div>
                </div>

                {/* 버튼 영역 수정 */}
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
