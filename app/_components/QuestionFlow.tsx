'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { ProgressGauge } from './ProgressGauge';
import { ResultPage } from './ResultPage';
import { Spinner } from '../../components/Spinner';
import { ExclamationIcon } from '../../components/ExclamationIcon';
import { CountUpNumber } from './CountUpNumber';
import Image from 'next/image';

// 상태 타입 정의
type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type PageState = 'start' | 'question' | 'result';

// 에러 타입 정의
type ErrorType = 'FETCH_ERROR' | 'PARSE_ERROR' | 'DATA_ERROR';

interface ErrorState {
    type: ErrorType;
    message: string;
    details?: string;
}

interface TestData {
    meta: {
        title: string;
        description: string;
        main_image: string;
    };
    content: {
        questions: Array<{
            id: string;
            text: string;
            image_url?: string;
            answers: Array<{
                id: string;
                text: string;
                type: string;
            }>;
        }>;
        results: Array<{
            type: string;
            title: string;
            description: string;
            categories: Array<{
                title: string;
                items: string[];
            }>;
        }>;
    };
    analytics: {
        participants: number;
        shares: number;
    };
    banners: {
        start: Array<{ image_url: string; landing_url: string }>;
        question: Array<{ image_url: string; landing_url: string }>;
        result: Array<{ image_url: string; landing_url: string }>;
    };
}

interface Answer {
    value: string;    // 답변 텍스트
    type: string;     // MBTI 타입 (E/I, S/N, T/F, J/P)
    timestamp: number;
    questionId: number;
}

interface TestStats {
    participants: number;
}

const STORAGE_KEY = {
    PARTICIPANTS: 'mbti_participants',
    CURRENT_STEP: 'mbti_current_step',
    ANSWERS: 'mbti_answers',
    PAGE_STATE: 'mbti_page_state',
    RESULT: 'mbti_result',
};

interface QuestionFlowProps {
    testTitle: string;
    questions: Array<{
        id: string;
        text: string;
        answers: Array<{
            text: string;
            type: string;
        }>;
    }>;
    results: Array<{
        type: string;
        title: string;
        description: string;
        categories: Array<{
            title: string;
            items: string[];
        }>;
    }>;
    banners: {
        start: Array<{ image_url: string; landing_url: string }>;
        question: Array<{ image_url: string; landing_url: string }>;
        result: Array<{ image_url: string; landing_url: string }>;
    };
}

// MBTI 점수 인터페이스
interface MBTIScores {
    extraversion: number;  // E(+) vs I(-)
    sensing: number;       // S(+) vs N(-)
    thinking: number;      // T(+) vs F(-)
    judging: number;      // J(+) vs P(-)
}

interface MBTIResult {
    type: string;
    title: string;
    description: string;
    categories: Array<{
        title: string;
        items: string[];
    }>;
}

// dimensions 객체의 타입을 명시적으로 정의
interface Dimensions {
    EI: { [key in 'E' | 'I']: number };
    SN: { [key in 'S' | 'N']: number };
    TF: { [key in 'T' | 'F']: number };
    JP: { [key in 'J' | 'P']: number };
}

export default function QuestionFlow({ testTitle, questions, results, banners }: QuestionFlowProps) {
    const [loadState, setLoadState] = useState<LoadState>('idle');
    const [pageState, setPageState] = useState<PageState>('start');
    const [testData, setTestData] = useState<TestData | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<ErrorState | null>(null);
    const [stats, setStats] = useState<TestStats>({ participants: 0 });  // 기본값으로 초기화
    const [direction, setDirection] = useState<'next' | 'prev'>('next');
    const [isAnimating, setIsAnimating] = useState(false);
    const [userName, setUserName] = useState('');
    const [nameError, setNameError] = useState('');
    const [mbtiResult, setMBTIResult] = useState<MBTIResult | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [imageCache, setImageCache] = useState<string[]>([]);

    // localStorage 초기화를 useEffect로 이동
    useEffect(() => {
        // localStorage에서 저장된 값 불러오기
        const savedStep = localStorage.getItem(STORAGE_KEY.CURRENT_STEP);
        const savedAnswers = localStorage.getItem(STORAGE_KEY.ANSWERS);
        const savedResult = localStorage.getItem(STORAGE_KEY.RESULT);
        const savedParticipants = localStorage.getItem(STORAGE_KEY.PARTICIPANTS);

        if (savedStep) setCurrentStep(Number(savedStep));
        if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
        if (savedResult) setResult(savedResult);
        if (savedParticipants) setStats({ participants: Number(savedParticipants) });
    }, []);

    // localStorage 업데이트를 useEffect로 이동
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY.CURRENT_STEP, String(currentStep));
    }, [currentStep]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY.ANSWERS, JSON.stringify(answers));
    }, [answers]);

    useEffect(() => {
        if (result) {
            localStorage.setItem(STORAGE_KEY.RESULT, result);
        }
    }, [result]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY.PARTICIPANTS, String(stats.participants));
    }, [stats.participants]);

    // 이미지 프리로딩 함수 수정
    const preloadImages = useCallback((questions: Array<{ 
        id: string; 
        text: string; 
        image_url?: string | null;
        answers: Array<{ text: string; type: string; }>;
    }>, currentIndex: number) => {
        if (typeof window === 'undefined') return;

        // 현재, 이전, 다음 이미지 URL 수집
        const imagesToPreload = [
            questions[currentIndex - 1]?.image_url,  // 이전 이미지
            questions[currentIndex]?.image_url,      // 현재 이미지
            questions[currentIndex + 1]?.image_url   // 다음 이미지
        ].filter((url): url is string => !!url && !imageCache.includes(url));

        // 새로운 이미지만 프리로드
        imagesToPreload.forEach(url => {
            const img = new window.Image();
            img.src = url;
            setImageCache(prev => [...prev, url]);
        });
    }, [imageCache]);

    // 이미지 프리로딩 효과 수정
    useEffect(() => {
        if (testData?.content?.questions) {
            preloadImages(testData.content.questions, currentStep);
        }
    }, [currentStep, testData, preloadImages]);

    // 데이터 로드
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoadState('loading');
                
                const [testResponse, statsResponse] = await Promise.all([
                    fetch('/api/sheets'),
                    fetch('/api/stats')
                ]);
                
                if (!testResponse.ok || !statsResponse.ok) {
                    throw new Error('Failed to fetch data');
                }

                const [testData, statsData] = await Promise.all([
                    testResponse.json(),
                    statsResponse.json()
                ]);
                
                if (!testData?.content) {
                    throw new Error('Invalid data structure');
                }

                setTestData(testData);
                setStats({ participants: statsData.participants });
                setLoadState('ready');
            } catch (err) {
                console.error('데이터 로드 실패:', err);
                setError({
                    type: 'FETCH_ERROR',
                    message: '데이터를 가져오는데 실패했습니다',
                    details: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다'
                });
                setLoadState('error');
            }
        };

        loadData();
    }, []);

    // 결과 계산 함수
    const calculateResult = () => {
        if (!testData) return;
        
        // 초기 dimensions 객체 설정
        const dimensions: Dimensions = {
            EI: { E: 0, I: 0 },
            SN: { S: 0, N: 0 },
            TF: { T: 0, F: 0 },
            JP: { J: 0, P: 0 }
        };

        // 답변 처리 수정
        answers.forEach(answer => {
            const type = answer.type.toUpperCase();
            if (type === 'E' || type === 'I') dimensions.EI[type]++;
            if (type === 'S' || type === 'N') dimensions.SN[type]++;
            if (type === 'T' || type === 'F') dimensions.TF[type]++;
            if (type === 'J' || type === 'P') dimensions.JP[type]++;
        });

        // MBTI 결과 계산
        const mbti = [
            dimensions.EI.E >= dimensions.EI.I ? 'E' : 'I',
            dimensions.SN.S >= dimensions.SN.N ? 'S' : 'N',
            dimensions.TF.T >= dimensions.TF.F ? 'T' : 'F',
            dimensions.JP.J >= dimensions.JP.P ? 'J' : 'P'
        ].join('');

        const resultData = testData.content.results.find((r) => r.type === mbti);

        if (resultData) {
            const formattedResult: MBTIResult = {
                type: mbti,
                title: resultData.title,
                description: resultData.description,
                categories: resultData.categories
            };
            setMBTIResult(formattedResult);
            setResult(resultData.description);
            setPageState('result');
            recordParticipation();
        } else {
            setError({
                type: 'DATA_ERROR',
                message: '결과를 찾을 수 없습니다',
                details: `계산된 MBTI: ${mbti}`
            });
        }
    };

    // 참여 기록
    const recordParticipation = async () => {
        try {
            const response = await fetch('/api/stats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to update stats');
            }

            const data = await response.json();
            setStats((prev) => ({
                ...prev,
                participants: data.participants
            }));
            localStorage.setItem(STORAGE_KEY.PARTICIPANTS, String(data.participants));
        } catch (error) {
            console.error('Error recording participation:', error);
            // 로컬에서라도 카운트는 증가
            const newParticipants = stats.participants + 1;
            setStats((prev) => ({
                ...prev,
                participants: newParticipants
            }));
            localStorage.setItem(STORAGE_KEY.PARTICIPANTS, String(newParticipants));
        }
    };

    // 테스트 시작
    const handleStart = () => {
        setPageState('question');
        setCurrentStep(0);
    };

    // 필요한 타입 가드만 남기기
    function isValidTestData(data: TestData | null): data is TestData {
        return data !== null && 'content' in data && 'questions' in data.content;
    }

    function isCustomError(err: any): err is ErrorState {
        return (
            typeof err === 'object' && 
            err !== null && 
            'type' in err && 
            'message' in err && 
            'details' in err
        );
    }

    // 답변 처리
    const handleAnswer = (answerText: string, type: string) => {
        // testData가 없거나 필수 데이터가 없으면 early return
        if (!testData?.content?.questions) {
            console.error('테스트 데이터가 없거나 유효하지 않습니다');
            return;
        }
        
        // 현재 답변 저장
        const newAnswer = {
            value: answerText,
            type: type,
            timestamp: Date.now(),
            questionId: currentStep
        };

        const updatedAnswers = [...answers, newAnswer];
        setAnswers(updatedAnswers);

        // 다음 단계로 이동
        if (currentStep < testData.content.questions.length - 1) {
            setCurrentStep(prev => prev + 1);
            setSelectedAnswer(null);  // 선택 상태 초기화
        } else {
            calculateResult();
        }
    };

    // 이전 질문으로 이동
    const handlePrevQuestion = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            setAnswers(answers.slice(0, -1));
        }
    };

    // 테스트 다시하기 핸들러 수정
    const handleRestart = () => {
        setPageState('start');
        setCurrentStep(0);
        setAnswers([]);
        setResult(null);
        // localStorage 초기화는 useEffect에서 자동으로 처리됨
    };

    // 공유 핸들러 추가
    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: testData?.meta?.title || 'MBTI 테스트',
                    text: testData?.meta?.description || '나의 MBTI를 알아보세요!',
                    url: window.location.href
                });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert('링크가 복사되었습니다!');
            }
        } catch (error) {
            console.error('공유하기 실패:', error);
        }
    };

    // 참여자 수 표시 컴포넌트
    const ParticipantCount = ({ count }: { count: number }) => {
        const [isLoading, setIsLoading] = useState(true);

        useEffect(() => {
            if (count > 0) {
                setIsLoading(false);
            }
        }, [count]);

        if (isLoading) {
            return (
                <span className="inline-block">
                    <span className="animate-pulse inline-block w-16 h-4 bg-gray-200 rounded"></span>
                </span>
            );
        }

        return <span>현재 {count}명이 참여했어요</span>;
    };

    // 이미지 컴포넌트 수정
    const QuestionImage = ({ url, step }: { url: string; step: number }) => {
        return (
            <div className="w-full max-w-md mb-4">
                <div className="h-[170px] mx-auto flex justify-center relative">
                    <div className="relative w-[302px] h-full">
                        <Image
                            src={url}
                            alt={`Question ${step + 1} image`}
                            fill
                            sizes="(max-width: 768px) 100vw, 302px"
                            className="object-contain"
                            priority
                            loading="eager"  // 즉시 로딩
                        />
                    </div>
                </div>
            </div>
        );
    };

    // 로딩 화면
    if (loadState === 'loading') {
        return (
            <div className="w-full overflow-x-hidden">
                <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#F1E9DB] to-[#E5D9C3]">
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <div className="w-full max-w-md">
                            <div className="h-[170px] mx-auto flex justify-center items-center">
                                <div className="flex flex-col items-center gap-4">
                                    <Spinner />
                                    <p className="text-[#8D6E63]">로딩 중...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 에러 화면
    if (loadState === 'error' && error) {
        return (
            <div className="w-full overflow-x-hidden">
                <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#F1E9DB] to-[#E5D9C3]">
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <div className="w-full max-w-md text-center">
                            <div className="text-red-600 mb-4">
                                <ExclamationIcon />
                            </div>
                            <h1 className="text-xl font-bold text-[#004D40] mb-2">
                                일시적인 오류가 발생했습니다
                            </h1>
                            <p className="text-[#8D6E63] mb-4">
                                잠시 후 다시 시도해주세요
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-[#004D40] text-white rounded hover:bg-opacity-90 transition-colors"
                            >
                                새로고침
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 시작 화면
    if (pageState === 'start') {
        return (
            <div className="w-full overflow-x-hidden animate-fade-in">
                <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#F1E9DB] to-[#E5D9C3]">
                    <div className="flex-1 flex flex-col items-center p-4">
                        {/* 제목 */}
                        <h1 className="test-title text-2xl font-bold mb-6 text-center text-[#004D40] mt-4">
                            {testData?.meta?.title || "MBTI 테스트"}
                        </h1>

                        {/* 메인 이미지 */}
                        <div className="w-full max-w-md mb-6">
                            <div className="h-[170px] mx-auto flex justify-center relative">
                                <div className="relative w-[302px] h-full">
                                    <Image
                                        src={testData?.meta?.main_image || '/images/main.png'}
                                        alt="Main Test Image"
                                        fill
                                        sizes="(max-width: 768px) 100vw, 302px"
                                        className="object-contain"
                                        priority
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 설명 */}
                        <p className="text-sm font-[300] mb-2 text-[#8D6E63] text-center max-w-md">
                            {testData?.meta?.description || "당신의 MBTI를 알아보세요"}
                        </p>

                        {/* 참여자 수 */}
                        <p className="text-sm font-[400] text-[#8D6E63] mb-1">
                            <ParticipantCount count={stats.participants} />
                        </p>

                        <div className="w-full max-w-md flex flex-col gap-2">
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="이름을 입력해주세요"
                                className="w-full px-4 py-3 border-2 border-[#CCE7E3] focus:border-[#004D40] outline-none text-[#004D40] bg-white text-center placeholder:text-center"
                                maxLength={10}
                            />

                            <button
                                type="button"
                                onClick={handleStart}
                                className="w-full px-6 py-3 bg-gradient-to-b from-[#004D40] to-[#00382E] 
                                text-white text-lg font-[800] hover:from-[#00382E] hover:to-[#002A22] 
                                transition-all cursor-pointer shadow-lg"
                            >
                                테스트 시작하기
                            </button>

                            {/* 공유하기 버튼 */}
                            <button
                                onClick={handleShare}
                                className="w-full px-6 py-2.5 bg-gradient-to-b from-[#D9FF66] to-[#CCEE5C] text-[#004D40] font-bold hover:from-[#CCEE5C] hover:to-[#BFDD52] transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <ShareIcon />
                                <span>친구에게 공유하기</span>
                            </button>
                        </div>
                    </div>

                    {/* 시작 페이지 배너 */}
                    {testData?.banners?.start?.[0] && (
                        <div className="w-full max-w-md mx-auto">
                            <div className="w-full bg-white mb-4">
                                <div className="aspect-[448/100] w-full">
                                    <a
                                        href={testData.banners.start[0].landing_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block h-full w-full"
                                    >
                                        <div className="relative w-full h-full">
                                            <Image
                                                src={testData.banners.start[0].image_url}
                                                alt="Advertisement"
                                                fill
                                                className="object-cover"
                                                unoptimized
                                                priority
                                            />
                                        </div>
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 로고 */}
                    <div className="flex justify-center mb-4">
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
                                style={{
                                    width: '100px',
                                    height: 'auto',
                                    objectFit: 'contain'
                                }}
                            />
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // 질문 화면
    if (pageState === 'question' && testData) {
        const question = testData.content.questions[currentStep];
        const currentBanner = testData.banners.question[currentStep % (testData.banners.question?.length || 1)];
        return (
            <div className="w-full overflow-x-hidden">
                <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#F1E9DB] to-[#E5D9C3]">
                    {/* 게이지바 영역 */}
                    <div className="sticky top-0 bg-[#F1E9DB] pt-4 pb-2">
                        <div className="relative px-4 w-full max-w-md mx-auto">
                            <ProgressGauge 
                                current={currentStep + 1} 
                                total={testData.content.questions.length} 
                            />
                            {/* 이전 버튼을 게이지 좌측 하단에 플로팅 */}
                            {currentStep > 0 && (
                                <button
                                    onClick={handlePrevQuestion}
                                    className="absolute -bottom-8 left-4 flex items-center justify-center w-8 h-8 rounded-full bg-white text-[#8D6E63] hover:text-[#004D40] transition-colors shadow-md"
                                    aria-label="이전 질문"
                                >
                                    <svg 
                                        className="w-5 h-5" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            strokeWidth={2} 
                                            d="M15 19l-7-7 7-7"
                                        />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 나머지 컨텐츠는 그대로 유지 */}
                    <div className="flex-1 flex flex-col items-center p-4">
                        {/* 질문 영역 */}
                        <div className="w-full max-w-md">
                            {/* Q넘버와 질문 텍스트 */}
                            <div className="text-center w-full max-w-md">
                                <div className="text-[#004D40] font-[900] text-2xl mb-2">
                                    Q{currentStep + 1}
                                </div>
                                <h2 className="text-2xl font-[900] mb-4 text-[#004D40] text-center max-w-xl leading-relaxed">
                                    {question.text}
                                </h2>
                            </div>

                            {/* 질문 이미지 */}
                            {question.image_url && (
                                <QuestionImage 
                                    url={question.image_url} 
                                    step={currentStep} 
                                />
                            )}

                            {/* 답변 버튼들 */}
                            <div className="w-full max-w-md space-y-1.5">
                                {question.answers.map((answer, idx) => (
                                    <button
                                        key={idx}
                                        className={`
                                            w-full py-2 px-3  
                                            ${selectedAnswer === idx 
                                                ? 'bg-[#004D40] text-white font-[900]' 
                                                : 'bg-white text-[#8D6E63] font-[700]'
                                            }
                                            text-center
                                            transition-all duration-300
                                            hover:bg-[#004D40] hover:text-white hover:font-[900]
                                            ${idx === 3 ? 'mb-4' : ''}
                                        `}
                                        onClick={() => handleAnswer(answer.text, answer.type)}
                                    >
                                        <span className="text-base">
                                            {answer.text}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 질문 페이지 배너 */}
                    {currentBanner && (
                        <div className="w-full max-w-md mx-auto">
                            <div className="w-full bg-white mb-4">
                                <div className="aspect-[448/100] w-full">
                                    <a
                                        href={currentBanner.landing_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block h-full w-full"
                                    >
                                        <div className="relative w-full h-full">
                                            <Image
                                                src={currentBanner.image_url}
                                                alt="Advertisement"
                                                fill
                                                className="object-cover"
                                                unoptimized
                                                priority
                                            />
                                        </div>
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 로고 원래대로 복구 */}
                    <div className="flex justify-center mb-4">
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
                                style={{
                                    width: '100px',
                                    height: 'auto',
                                    objectFit: 'contain'
                                }}
                            />
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // 결과 화면
    if (pageState === 'result' && mbtiResult && testData) {
        return (
            <ResultPage
                testTitle={testData.meta.title}
                result={mbtiResult}
                bottomImage={testData.banners.result[0]}
                analytics={{
                    participants: stats.participants,
                    shares: 0,
                }}
                onRestart={handleRestart}
                userName={userName}
            />
        );
    }

    return null;
}

// ShareIcon 컴포넌트
const ShareIcon = () => (
    <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        />
    </svg>
);