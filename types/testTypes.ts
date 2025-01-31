export interface TestData {
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
        start: Array<{
            image_url: string;
            landing_url: string;
        }>;
        question: Array<{
            image_url: string;
            landing_url: string;
        }>;
        result: Array<{
            image_url: string;
            landing_url: string;
        }>;
    };
}

interface Analytics {
    participants: number;
    shares: number;
    lastUpdated: string;
}

interface TestStats {
    participants: number;
    shares: number;
    trending: boolean;
}

interface ResultCategory {
    title: string;
    items: string[];
}

interface TestResult {
    type: string;
    title: string;
    description: string;
    categories: ResultCategory[];
    image: string;
} 