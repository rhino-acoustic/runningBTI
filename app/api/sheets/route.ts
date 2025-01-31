import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { sheetCache } from '../../../utils/cache';

export async function GET() {
    const CACHE_KEY = 'sheet_data';
    
    try {
        // 환경변수 체크 로그 추가
        console.log('=== 환경변수 체크 ===');
        console.log({
            GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID?.slice(0, 4) + '...',
            GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL?.slice(0, 4) + '...',
            GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? '설정됨' : '미설정',
            SHEET_ID: process.env.SHEET_ID?.slice(0, 4) + '...',
            AUTH_URI: process.env.GOOGLE_AUTH_URI ? '설정됨' : '미설정',
            TOKEN_URI: process.env.GOOGLE_TOKEN_URI ? '설정됨' : '미설정'
        });

        // credentials 객체 체크 로그
        const credentials = {
            type: 'service_account',
            project_id: process.env.GOOGLE_PROJECT_ID,
            private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            client_id: process.env.GOOGLE_CLIENT_ID,
            auth_uri: process.env.GOOGLE_AUTH_URI,
            token_uri: process.env.GOOGLE_TOKEN_URI,
            auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
            client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL
        };

        console.log('=== Credentials 체크 ===');
        console.log({
            hasAllFields: Object.values(credentials).every(val => val !== undefined),
            fieldsStatus: Object.keys(credentials).reduce((acc, key) => ({
                ...acc,
                [key]: credentials[key] ? '설정됨' : '미설정'
            }), {})
        });

        // 캐시 확인
        const cachedData = sheetCache.get(CACHE_KEY);
        if (cachedData) {
            return NextResponse.json(cachedData);
        }

        // 캐시가 없으면 데이터 가져오기
        const auth = new google.auth.GoogleAuth({
            credentials: {
                type: 'service_account',
                project_id: process.env.GOOGLE_PROJECT_ID,
                private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                client_id: process.env.GOOGLE_CLIENT_ID,
                auth_uri: process.env.GOOGLE_AUTH_URI,
                token_uri: process.env.GOOGLE_TOKEN_URI,
                auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
                client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range: 'mbti!A1:K1000',
        });

        const data = parseSpreadsheetData(response.data.values || []);
        
        // 데이터 캐싱
        sheetCache.set(CACHE_KEY, data);

        return NextResponse.json(data);
    } catch (error) {
        console.error('=== API 에러 상세 ===');
        console.error({
            error,
            stack: error instanceof Error ? error.stack : undefined,
            envVars: {
                hasProjectId: !!process.env.GOOGLE_PROJECT_ID,
                hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
                hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
                hasSheetId: !!process.env.SHEET_ID
            }
        });

        return NextResponse.json(
            { 
                error: '데이터를 가져오는데 실패했습니다', 
                details: error instanceof Error ? error.message : '알 수 없는 오류',
                envCheck: {
                    hasProjectId: !!process.env.GOOGLE_PROJECT_ID,
                    hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
                    hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
                    hasSheetId: !!process.env.SHEET_ID
                }
            },
            { status: 500 }
        );
    }
}

function parseSpreadsheetData(allRows: string[][]): any {
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

    const responseData = {
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