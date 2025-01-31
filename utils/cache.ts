class Cache<T> {
    private cache: Map<string, { data: T; timestamp: number }>;
    private ttl: number; // Time to live in milliseconds

    constructor(ttl = 3600000) { // 기본 1시간
        this.cache = new Map();
        this.ttl = ttl;
    }

    get(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    set(key: string, data: T): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
}

export const sheetCache = new Cache(30 * 60 * 1000); // 30분 