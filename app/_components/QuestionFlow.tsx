'use client';
import React, { useEffect, useState } from 'react';
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

export default function QuestionFlow({ testTitle, questions, results }: QuestionFlowProps) {
    const [loadState, setLoadState] = useState<LoadState>('idle');
    const [pageState, setPageState] = useState<PageState>('start');
    const [testData, setTestData] = useState<TestData | null>(null);
    const [currentStep, setCurrentStep] = useState(() =>
        Number(localStorage.getItem(STORAGE_KEY.CURRENT_STEP) || '0'),
    );
    const [answers, setAnswers] = useState<Answer[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY.ANSWERS);
        return saved ? JSON.parse(saved) : [];
    });
    const [result, setResult] = useState<string | null>(() =>
        localStorage.getItem(STORAGE_KEY.RESULT),
    );
    const [error, setError] = useState<ErrorState | null>(null);
    const [stats, setStats] = useState<TestStats>(() => ({
        participants: Number(localStorage.getItem(STORAGE_KEY.PARTICIPANTS) || '0'),
    }));
    const [direction, setDirection] = useState<'next' | 'prev'>('next');
    const [isAnimating, setIsAnimating] = useState(false);
    const [userName, setUserName] = useState('');
    const [nameError, setNameError] = useState('');
    const [mbtiResult, setMBTIResult] = useState<MBTIResult | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

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

    // 데이터 로드
    useEffect(() => {
        const loadTestData = async () => {
            try {
                setLoadState('loading');
                const response = await fetch('/api/sheets');
                
                if (!response.ok) {
                    setError({
                        type: 'FETCH_ERROR',
                        message: '데이터를 가져오는데 실패했습니다',
                        details: `Status: ${response.status}`
                    });
                    setLoadState('error');
                    return;
                }

                const data: TestData = await response.json();
                
                if (!data?.content) {
                    setError({
                        type: 'PARSE_ERROR',
                        message: '잘못된 데이터 형식입니다',
                        details: 'Invalid data structure'
                    });
                    setLoadState('error');
                    return;
                }

                setTestData(data);
                setLoadState('ready');
            } catch (err) {
                console.error('데이터 로드 실패:', err);
                const errorState: ErrorState = {
                    type: 'FETCH_ERROR',
                    message: '데이터를 가져오는데 실패했습니다',
                    details: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다'
                };
                setError(errorState);
                setLoadState('error');
            }
        };

        loadTestData();
    }, []);

    // 참여 기록
    const recordParticipation = () => {
        const newParticipants = stats.participants + 1;
        setStats((prev) => ({
            ...prev,
            participants: newParticipants,
        }));
        localStorage.setItem(STORAGE_KEY.PARTICIPANTS, String(newParticipants));
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
        localStorage.setItem(STORAGE_KEY.ANSWERS, JSON.stringify(updatedAnswers));

        // 다음 단계로 이동
        if (currentStep < testData.content.questions.length - 1) {
            setCurrentStep(prev => prev + 1);
            localStorage.setItem(STORAGE_KEY.CURRENT_STEP, String(currentStep + 1));
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

    // 테스트 다시하기 핸들러 추가
    const handleRestart = () => {
        setPageState('start');
        setCurrentStep(0);
        setAnswers([]);
        setResult(null);
        // localStorage 초기화
        localStorage.removeItem(STORAGE_KEY.CURRENT_STEP);
        localStorage.removeItem(STORAGE_KEY.ANSWERS);
        localStorage.removeItem(STORAGE_KEY.PAGE_STATE);
        localStorage.removeItem(STORAGE_KEY.RESULT);
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

    // 로딩 화면
    if (loadState === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#F1E9DB] to-[#E5D9C3]">
                <Spinner />
                <p className="mt-4 text-[#8D6E63]">로딩 중...</p>
            </div>
        );
    }

    // 에러 화면
    if (loadState === 'error' && error) {
        const errorInfo = {
            type: error.type,
            message: error.message,
            details: error.details
        };

        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#F1E9DB] to-[#E5D9C3] p-4">
                <div className="w-full max-w-md">
                    <div className="flex items-center mb-4 text-red-600">
                        <ExclamationIcon />
                        <span className="ml-2 font-bold">오류가 발생했습니다</span>
                    </div>
                    <p className="mb-4 text-[#8D6E63]">{error.message}</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
                                alert('에러 정보가 복사되었습니다.');
                            }}
                            className="flex items-center gap-1 text-sm text-[#8D6E63] hover:text-[#5D4037]"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                data-oid="copy-icon"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                                    data-oid="qs-d1-d"
                                />
                            </svg>
                            복사
                        </button>
                    </div>
                    <pre className="mt-2 p-4 bg-red-50 text-red-600 rounded-lg text-sm whitespace-pre-wrap w-full cursor-text select-text">
                        {JSON.stringify(errorInfo, null, 2)}
                    </pre>
                </div>
                <div className="mt-6 flex gap-4">
                    <button
                        className="px-6 py-2 bg-[#004D40] text-white hover:bg-opacity-90"
                        onClick={() => window.location.reload()}
                    >
                        다시 시도
                    </button>
                    <button
                        className="px-6 py-2 border-2 border-[#8D6E63] text-[#8D6E63] hover:bg-[#8D6E63] hover:text-white"
                        onClick={() => console.log('현재 상태:', { error, testData })}
                    >
                        디버그 정보
                    </button>
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
                            현재{' '}
                            {stats ? (
                                <CountUpNumber end={stats.participants} />
                            ) : (
                                '...'
                            )}{' '}
                            명이 참여했어요
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

                    {/* 하단 배너 */}
                    <div className="h-[100px] bg-white mb-2 max-w-md mx-auto overflow-hidden">
                        {testData?.banners?.start?.[0] && (
                            <a
                                href={testData.banners.start[0].landing_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block h-full w-full"
                            >
                                <Image
                                    src={testData.banners.start[0].image_url}
                                    alt="Advertisement"
                                    width={448}
                                    height={100}
                                    style={{ width: '100%', height: 'auto' }}
                                    className="object-cover"
                                    priority
                                />
                            </a>
                        )}
                    </div>

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
        return (
            <div className="w-full overflow-x-hidden animate-fade-in">
                <div className="flex flex-col h-screen bg-gradient-to-b from-[#F1E9DB] to-[#E5D9C3]">
                    {/* 게이지 영역 */}
                    <div className="sticky top-0 w-full bg-[#F1E9DB] pt-4 pb-1">
                        <div className="max-w-md mx-auto">
                            <ProgressGauge
                                current={currentStep + 1}
                                total={testData.content.questions.length}
                            />
                        </div>
                    </div>

                    {/* 질문 영역 */}
                    <div className="flex-1 flex flex-col items-center px-4 pt-1">
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
                            <div className="w-full max-w-md mb-4">
                                <div className="h-[170px] mx-auto flex justify-center relative">
                                    <div className="relative w-[302px] h-full">
                                        <Image
                                            src={question.image_url}
                                            alt={`Question ${currentStep + 1} image`}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 302px"
                                            className="object-contain"
                                            priority
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 답변 버튼들 */}
                        <div className="w-full max-w-md space-y-1.5">
                            {question.answers.map((answer, idx) => (
                                <button
                                    key={idx}
                                    className={`
                                        w-full py-2 px-3  
                                        bg-white text-[#8D6E63] 
                                        text-center font-[700] 
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

                    {/* 하단 배너 */}
                    <div className="h-[100px] bg-white mb-2 max-w-md mx-auto overflow-hidden">
                        {testData?.banners?.question?.[currentStep % (testData.banners.question?.length || 1)] && (
                            <a
                                href={testData.banners.question[currentStep % (testData.banners.question.length || 1)].landing_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block h-full w-full"
                            >
                                <Image
                                    src={testData.banners.question[currentStep % (testData.banners.question.length || 1)].image_url}
                                    alt="Advertisement"
                                    width={448}
                                    height={100}
                                    style={{ width: '100%', height: 'auto' }}
                                    className="object-cover"
                                    priority
                                />
                            </a>
                        )}
                    </div>

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

    // 결과 화면
    if (pageState === 'result' && result && mbtiResult && testData) {
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