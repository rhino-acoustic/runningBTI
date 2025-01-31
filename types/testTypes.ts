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