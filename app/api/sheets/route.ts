import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { sheetCache } from '../../../utils/cache';
import { JWT } from 'google-auth-library';

// 필요한 자격 증명 필드를 정의하는 인터페이스
interface Credentials {
    type: string;
    project_id: string | undefined;
    private_key_id: string | undefined;
    private_key: string | undefined;
    client_email: string | undefined;
    client_id: string | undefined;
    auth_uri: string | undefined;
    token_uri: string | undefined;
    auth_provider_x509_cert_url: string | undefined;
    client_x509_cert_url: string | undefined;
}

// 자격 증명 상태를 위한 인터페이스
interface CredentialsStatus {
    [key: string]: string;  // 인덱스 시그니처 추가
}

interface SpreadsheetData {
    meta: {
        title: string;
        description: string;
        main_image: string;
    };
    banners: {
        start: Array<{ image_url: string; landing_url: string }>;
        question: Array<{ image_url: string; landing_url: string }>;
        result: Array<{ image_url: string; landing_url: string }>;
    };
    content: {
        questions: Array<{
            id: string;
            text: string;
            image_url: string | null;
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
    };
}

export async function GET() {
    const CACHE_KEY = 'sheet_data';
    
    try {
        // 캐시 확인
        const cachedData = sheetCache.get(CACHE_KEY);
        if (cachedData) {
            return NextResponse.json(cachedData);
        }

        // 환경변수 유효성 검사
        if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.SHEET_ID) {
            console.error('Missing required environment variables');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        // 환경변수 체크 로깅 추가
        console.log('=== 환경변수 체크 ===');
        console.log({
            hasProjectId: !!process.env.GOOGLE_PROJECT_ID,
            hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
            hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
            hasSheetId: !!process.env.SHEET_ID
        });

        // 자격 증명 객체 생성
        const credentials: Credentials = {
            type: 'service_account',
            project_id: process.env.GOOGLE_PROJECT_ID,
            private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.split(String.raw`\n`).join('\n'),
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            client_id: process.env.GOOGLE_CLIENT_ID,
            auth_uri: process.env.GOOGLE_AUTH_URI,
            token_uri: process.env.GOOGLE_TOKEN_URI,
            auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
            client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL
        };

        // 자격 증명 체크
        console.log('=== Credentials 체크 ===');
        console.log({
            hasAllFields: Object.values(credentials).every(Boolean),
            fieldsStatus: Object.keys(credentials).reduce<CredentialsStatus>((acc, key) => ({
                ...acc,
                [key]: credentials[key as keyof Credentials] ? '설정됨' : '미설정'
            }), {})
        });

        // Google Auth 클라이언트 생성
        const client = new JWT({
            email: process.env.GOOGLE_CLIENT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const sheets = google.sheets({ version: 'v4', auth: client });
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range: 'A:Z'
        });

        const data = parseSpreadsheetData(response.data.values || []);
        
        // 데이터 캐싱
        sheetCache.set(CACHE_KEY, data);

        return NextResponse.json(data);
    } catch (error: unknown) {
        const err = error as Error;
        console.error('Detailed API Error:', {
            message: err.message,
            stack: err.stack,
            name: err.name
        });
        return NextResponse.json(
            { error: 'Failed to fetch data', details: err.message },
            { status: 500 }
        );
    }
}

function parseSpreadsheetData(allRows: string[][]): SpreadsheetData {
    // 전체 데이터를 가져와서 필요한 부분만 필터링
    let questionsStartIndex = allRows.findIndex(row => row[0] === 'question.id');
    let resultsStartIndex = allRows.findIndex(row => row[0] === '# [RESULTS]');
    
    if (questionsStartIndex === -1 || resultsStartIndex === -1) {
        throw new Error('Required sections not found in spreadsheet');
    }

    // 실제 질문 데이터 파싱 (헤더 다음 행부터)
    const questionRows = allRows.slice(questionsStartIndex + 1, resultsStartIndex);
    const questions = questionRows
        .filter(row => row[0]?.startsWith('q'))
        .map((row, index) => ({
            id: `q${index + 1}`,
            text: row[1],
            image_url: row[10] || null,  // 이미지 URL은 K열에 있다고 가정
            answers: [
                { text: row[2], type: row[3] },
                { text: row[4], type: row[5] },
                { text: row[6], type: row[7] },
                { text: row[8], type: row[9] }
            ].filter(answer => answer.text && answer.type)
        }));

    // 결과 데이터 파싱 (RESULTS 섹션 이후)
    const resultRows = allRows.slice(resultsStartIndex + 1);
    const results = resultRows
        .filter(row => row[0]?.length === 4 && /^[EI][SN][TF][JP]$/.test(row[0]))  // MBTI 타입 패턴 검사
        .map(row => ({
            type: row[0],
            title: row[1],
            description: row[2],
            categories: [
                {
                    title: row[3],
                    items: (row[4] || '').split(',').map(item => item.trim()).filter(Boolean)
                },
                {
                    title: row[5],
                    items: (row[6] || '').split(',').map(item => item.trim()).filter(Boolean)
                },
                {
                    title: row[7],
                    items: (row[8] || '').split(',').map(item => item.trim()).filter(Boolean)
                }
            ].filter(cat => cat.title && cat.items.length > 0)
        }));

    // 메타 데이터와 배너 정보 가져오기
    const metaRows = allRows.filter(row => 
        row[0]?.startsWith('meta.') || 
        row[0]?.startsWith('banner.')
    );

    // 배너 이미지 섹션 찾기 및 파싱 추가
    let bottomImagesStartIndex = allRows.findIndex(row => row[0] === '# [BOTTOM_IMAGES]');
    if (bottomImagesStartIndex === -1) {
        throw new Error('Bottom images section not found in spreadsheet');
    }

    // 배너 데이터 파싱 (헤더 다음 행부터)
    const bannerRows = allRows.slice(bottomImagesStartIndex + 2);
    const banners = bannerRows
        .filter(row => row[0]) // 비어있지 않은 행만
        .reduce((acc, row) => {
            const [pageType, imageUrl, landingUrl] = row;
            if (!acc[pageType]) {
                acc[pageType] = [];
            }
            acc[pageType].push({
                image_url: imageUrl,
                landing_url: landingUrl
            });
            return acc;
        }, {} as Record<string, Array<{ image_url: string; landing_url: string }>>);

    const responseData: SpreadsheetData = {
        meta: {
            title: metaRows.find(row => row[0] === 'meta.title')?.[1] || "MBTI 테스트",
            description: metaRows.find(row => row[0] === 'meta.description')?.[1] || "당신의 MBTI를 알아보세요",
            main_image: metaRows.find(row => row[0] === 'meta.main_image')?.[1] || "/images/main.png",
        },
        banners: {
            start: banners.start || [],
            question: banners.question || [],
            result: banners.result || []
        },
        content: {
            questions,
            results
        }
    };

    return responseData;
} 