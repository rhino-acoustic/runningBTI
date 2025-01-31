type CacheData = {
    data: any;
    timestamp: number;
};

const CACHE_DURATION = 5 * 60 * 1000; // 5분

class SheetCache {
    private static instance: SheetCache;
    private cache: Map<string, CacheData>;

    private constructor() {
        this.cache = new Map();
    }

    static getInstance(): SheetCache {
        if (!SheetCache.instance) {
            SheetCache.instance = new SheetCache();
        }
        return SheetCache.instance;
    }

    set(key: string, data: any): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    get(key: string): any | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
        if (isExpired) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    clear(): void {
        this.cache.clear();
    }
}

export const sheetCache = SheetCache.getInstance(); 