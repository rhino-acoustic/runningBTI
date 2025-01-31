import Papa from 'papaparse';
import { TestData } from '../types/testTypes';

const CSV_HEADERS = {
  META_TITLE: 'meta_title',
  META_DESCRIPTION: 'meta_description',
  QUESTION_ID: 'q_id',
  QUESTION_TEXT: 'q_text',
  ANSWER_ID: 'a_id',
  ANSWER_TEXT: 'a_text',
  ANSWER_TYPE: 'a_type',
  RESULT_TITLE: 'result_title',
  RESULT_DESCRIPTION: 'result_desc'
} as const;

// 데이터 유효성 검사 함수 추가
const validateCSVStructure = (data: any[]) => {
  const requiredSections = ['META', 'QUESTION', 'RESULT'];
  const hasAllSections = requiredSections.every(section => 
    data.some(row => row.__parsed_extra?.includes(`[${section}]`))
  );
  
  if (!hasAllSections) {
    throw new Error('CSV 파일에 필수 섹션이 누락되었습니다');
  }
};

// 필수 필드 검증
const validateRequiredFields = (row: any, section: string) => {
  const requiredFields: {[key: string]: string[]} = {
    META: ['meta_title', 'meta_description'],
    QUESTION: ['q_id', 'q_text', 'a_id', 'a_text'],
    RESULT: ['result_type', 'result_title']
  };

  requiredFields[section].forEach(field => {
    if (!row[field]) {
      throw new Error(`[${section}] 섹션에 ${field} 필드 누락`);
    }
  });
};

// CSV 파일을 섹션별로 분리하여 파싱하는 함수
const parseSectionedCSV = (csvText: string) => {
    // 섹션 구분
    const sections = csvText.split(/^#\s*\[([^\]]+)\]/m).filter(Boolean);
    const sectionData: { [key: string]: any[] } = {};
    
    for (let i = 0; i < sections.length; i += 2) {
        const sectionName = sections[i].trim();
        const sectionContent = sections[i + 1].trim();
        
        // 섹션별 파싱
        const { data } = Papa.parse(sectionContent, {
            header: true,
            skipEmptyLines: true
        });
        
        sectionData[sectionName] = data;
    }
    
    return sectionData;
};

interface MBTIResult {
  type: string;
  title: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  compatible: string[];
  careers: string[];
}

export const parseTestData = (csvText: string) => {
    console.log('Starting CSV parsing...');
    const results = Papa.parse(csvText, { 
        header: false,
        skipEmptyLines: true 
    });
    
    console.log('Raw parsed data:', results.data);
    
    const data: any = { 
        meta: {}, 
        content: { 
            questions: [], 
            results: [] 
        },
        analytics: {
            participants: 0,
            shares: 0
        },
        bottom_images: []
    };
    
    let currentSection = '';
    
    results.data.forEach((row: any, index: number) => {
        console.log(`Processing row ${index}:`, row);

        if (!row[0]) {
            console.log('Empty row, skipping...');
            return;
        }

        // 섹션 헤더 확인
        if (row[0].includes('[META]')) {
            console.log('Entering META section');
            currentSection = 'meta';
            return;
        }
        if (row[0].includes('[QUESTIONS]')) {
            console.log('Entering QUESTIONS section');
            currentSection = 'questions';
            return;
        }
        if (row[0].includes('[RESULTS]')) {
            console.log('Entering RESULTS section');
            currentSection = 'results';
            return;
        }
        if (row[0].includes('[BOTTOM_IMAGES]')) {
            console.log('Found BOTTOM_IMAGES section');
            currentSection = 'bottom_images';
            return;
        }
        if (row[0].includes('[ANALYTICS]')) {
            currentSection = 'analytics';
            return;
        }
        if (row[0].startsWith('#')) return;

        switch (currentSection) {
            case 'meta':
                if (row[0].startsWith('meta.')) {
                    const key = row[0].split('.')[1];
                    data.meta[key] = row[1];
                }
                break;

            case 'bottom_images':
                if (row[0] === 'page_type') return;
                if (row[0]) {
                    console.log('Adding bottom image:', {
                        page_type: row[0],
                        image_url: row[1],
                        landing_url: row[2]
                    });
                    data.bottom_images.push({
                        page_type: row[0],
                        image_url: row[1],
                        landing_url: row[2]
                    });
                }
                break;

            case 'questions':
                if (row[0].startsWith('question.id')) return;
                if (row[0].startsWith('q')) {
                    const answers = [];
                    for (let i = 0; i < 4; i++) {
                        const answerText = row[2 + (i * 2)];
                        const answerType = row[3 + (i * 2)];
                        if (answerText && answerType) {
                            answers.push({
                                text: answerText,
                                type: answerType.trim()
                            });
                        }
                    }
                    data.content.questions.push({
                        id: row[0],
                        text: row[1],
                        answers,
                        image: row[10] || null
                    });
                }
                break;

            case 'results':
                if (row[0].startsWith('result.')) {
                    console.log('Skipping results header row');
                    return;
                }
                
                console.log('Processing result row:', {
                    rowLength: row.length,
                    type: row[0],
                    title: row[1]
                });

                if (row[0] && row.length >= 10) {
                    const result = {
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
                    };
                    
                    data.content.results.push(result);
                } else {
                    console.warn('Invalid result row:', {
                        rowLength: row.length,
                        row: row
                    });
                }
                break;

            case 'analytics':
                if (row[0] === 'analytics_api_endpoint') {
                    data.analytics_api_endpoint = row[1];
                }
                break;
        }
    });

    console.log('Final parsed data:', {
        metaCount: Object.keys(data.meta).length,
        questionCount: data.content.questions.length,
        resultCount: data.content.results.length,
        results: data.content.results
    });
    
    return data;
}; 