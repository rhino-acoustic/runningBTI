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
            categories: string[];
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

export default function QuestionFlow({ testTitle, questions, results }: QuestionFlowProps) {
    // ... state 선언들은 그대로 유지 ...

    // 결과 계산 함수
    const calculateResult = () => {
        if (!testData) return;
        
        const scores: MBTIScores = {
            extraversion: 0,
            sensing: 0,
            thinking: 0,
            judging: 0
        };

        answers.forEach(answer => {
            const type = answer.type.toUpperCase();
            switch(type) {
                case 'E': scores.extraversion++; break;
                case 'I': scores.extraversion--; break;
                case 'S': scores.sensing++; break;
                case 'N': scores.sensing--; break;
                case 'T': scores.thinking++; break;
                case 'F': scores.thinking--; break;
                case 'J': scores.judging++; break;
                case 'P': scores.judging--; break;
            }
        });

        const mbti = [
            scores.extraversion >= 0 ? 'E' : 'I',
            scores.sensing >= 0 ? 'S' : 'N',
            scores.thinking >= 0 ? 'T' : 'F',
            scores.judging >= 0 ? 'J' : 'P'
        ].join('');

        const resultData = testData.content.results.find((r) => r.type === mbti);

        if (resultData) {
            setMBTIResult({
                type: mbti,
                title: resultData.title,
                description: resultData.description,
                categories: resultData.categories
            });
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

    // ... 나머지 코드는 그대로 유지 ...
} 