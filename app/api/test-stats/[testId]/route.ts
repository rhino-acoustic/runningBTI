import { NextResponse } from 'next/server';

// 실제 데이터는 데이터베이스에서 관리되어야 합니다
let stats = {
    'mbti-test': {
        participants: 1234,
        shares: 567,
    },
};

export async function GET(
    request: Request,
    { params }: { params: { testId: string } }
) {
    const testId = params.testId;
    const testStats = stats[testId as keyof typeof stats];

    if (!testStats) {
        return NextResponse.json(
            { error: 'Test not found' },
            { status: 404 }
        );
    }

    return NextResponse.json(testStats);
}

export async function POST(
    request: Request,
    { params }: { params: { testId: string } }
) {
    const testId = params.testId;
    const testStats = stats[testId as keyof typeof stats];

    if (!testStats) {
        return NextResponse.json(
            { error: 'Test not found' },
            { status: 404 }
        );
    }

    // 참여자 수 증가
    testStats.participants += 1;

    return NextResponse.json(testStats);
}

export async function PUT(
    request: Request,
    { params }: { params: { testId: string } }
) {
    const testId = params.testId;
    const testStats = stats[testId as keyof typeof stats];

    if (!testStats) {
        return NextResponse.json(
            { error: 'Test not found' },
            { status: 404 }
        );
    }

    // 공유 수 증가
    testStats.shares += 1;

    return NextResponse.json(testStats);
} 