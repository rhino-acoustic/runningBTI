import QuestionFlow from './_components/QuestionFlow';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import type { TestData } from '@/types/testTypes';
import { ErrorBoundary } from '@/components/ErrorBoundary';

async function getSheetData() {
  try {
    // JWT 클라이언트 생성
    const client = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    // 환경변수 체크
    if (!process.env.SHEET_ID) {
      throw new Error('SHEET_ID is not defined');
    }

    // sheets API 초기화
    const sheets = google.sheets({ version: 'v4', auth: client });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'A:Z',
    });

    const rows = response.data.values;
    if (!rows) {
      throw new Error('No data found in spreadsheet');
    }

    // 데이터 파싱
    const data = {
      meta: {
        title: '',
        description: '',
        main_image: ''
      },
      content: {
        questions: [],
        results: []
      },
      analytics: {
        participants: 0,
        shares: 0
      },
      banners: {
        start: [],
        question: [],
        result: []
      }
    } as TestData;

    let currentSection = '';

    rows.forEach(row => {
      if (!row[0]) return;

      if (row[0].startsWith('#')) {
        currentSection = row[0].replace(/[#\[\]]/g, '').trim();
        return;
      }

      switch (currentSection) {
        case 'META':
          if (row[0] === 'meta.title') data.meta.title = row[1];
          if (row[0] === 'meta.description') data.meta.description = row[1];
          break;

        case 'QUESTIONS':
          if (row[0] === 'question.id') return;
          if (row[0] && row[1] && row.length >= 10) {
            data.content.questions.push({
              id: row[0],
              text: row[1],
              answers: [
                { text: row[2], type: row[3] },
                { text: row[4], type: row[5] },
                { text: row[6], type: row[7] },
                { text: row[8], type: row[9] }
              ].filter(answer => answer.text && answer.type)
            });
          }
          break;

        case 'RESULTS':
          if (row[0] === 'result.type') return;
          if (row[0] && row.length >= 9) {
            data.content.results.push({
              type: row[0],
              title: row[1],
              description: row[2],
              categories: [
                {
                  title: row[3],
                  items: (row[4] || '').split(',').map((item: string) => item.trim()).filter(Boolean)
                },
                {
                  title: row[5],
                  items: (row[6] || '').split(',').map((item: string) => item.trim()).filter(Boolean)
                },
                {
                  title: row[7],
                  items: (row[8] || '').split(',').map((item: string) => item.trim()).filter(Boolean)
                }
              ].filter(cat => cat.title && cat.items.length > 0)
            });
          }
          break;
      }
    });

    return data;
  } catch (error: unknown) {
    console.error('Error fetching spreadsheet data:', error);
    throw new Error(error instanceof Error ? error.message : 'Unknown error fetching data');
  }
}

// 페이지를 동적으로 생성하도록 설정
export const dynamic = 'force-dynamic';

// 캐시 설정 추가
export const revalidate = 3600; // 1시간마다 재검증

export default async function Home() {
  try {
    const data = await getSheetData();
    
    return (
      <ErrorBoundary fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#F1E9DB] to-[#E5D9C3] p-4">
          <div className="w-full max-w-md text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[#004D40] mb-2">
              데이터를 불러오는데 실패했습니다
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
      }>
        <main className="flex min-h-screen flex-col items-center justify-between">
          <QuestionFlow 
            testTitle={data.meta.title}
            questions={data.content.questions}
            results={data.content.results}
          />
        </main>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Error in page:', error);
    throw error; // Next.js error page will handle this
  }
}
