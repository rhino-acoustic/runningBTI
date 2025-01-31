import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const client = new JWT({
            email: process.env.GOOGLE_CLIENT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const sheets = google.sheets({ version: 'v4', auth: client });
        
        // 현재 참여자 수 가져오기
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range: 'Stats!A1'  // Stats 시트의 A1 셀
        });

        const currentParticipants = Number(response.data.values?.[0]?.[0] || 0);
        const newParticipants = currentParticipants + 1;

        // 참여자 수 업데이트
        await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.SHEET_ID,
            range: 'Stats!A1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [[newParticipants]]
            }
        });

        return NextResponse.json({ participants: newParticipants });
    } catch (error) {
        console.error('Failed to update stats:', error);
        return NextResponse.json(
            { error: 'Failed to update stats' },
            { status: 500 }
        );
    }
} 