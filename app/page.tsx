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
  } catch (error) {
    console.error('Error fetching spreadsheet data:', error);
    throw error;
  }
}

// 페이지를 동적으로 생성하도록 설정
export const dynamic = 'force-dynamic';

// 캐시 설정 추가
export const revalidate = 3600; // 1시간마다 재검증

export default async function Home() {
  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <main className="flex min-h-screen flex-col items-center justify-between">
        {/* ... 기존 코드 ... */}
      </main>
    </ErrorBoundary>
  );
}
