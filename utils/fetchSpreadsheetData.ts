'use client';

import { google } from 'googleapis';
import type { TestData } from '@/types/testTypes';
import { Cache } from 'cache-manager';

interface SheetResponse {
    range: string;
    majorDimension: string;
    values: string[][];
}

export const sheetCache = new Cache(5 * 60 * 1000); // 5분

export async function fetchSpreadsheetData() {
    try {
        const response = await fetch('/api/sheets');
        if (!response.ok) {
            throw new Error('Failed to fetch spreadsheet data');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching spreadsheet data:', error);
        throw error;
    }
}

export function parseSpreadsheetData(rows: string[][]): TestData {
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
} 