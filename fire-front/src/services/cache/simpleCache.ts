type CacheEntry<T> = {
    data: T;
    expires: number;
};

/**
 * TTL + in-flight dedupe 캐시.
 * 동일 키에 대한 동시 요청은 하나의 Promise를 공유합니다.
 */
export function createCachedFetcher<T>(
    fetcher: (key: string) => Promise<T>,
    ttlMs: number
) {
    const cache = new Map<string, CacheEntry<T>>();
    const inflight = new Map<string, Promise<T>>();

    return async (key: string): Promise<T> => {
        const hit = cache.get(key);
        if (hit && hit.expires > Date.now()) {
            return hit.data;
        }

        const pending = inflight.get(key);
        if (pending) return pending;

        const promise = fetcher(key)
            .then((data) => {
                cache.set(key, { data, expires: Date.now() + ttlMs });
                inflight.delete(key);
                return data;
            })
            .catch((err) => {
                inflight.delete(key);
                throw err;
            });

        inflight.set(key, promise);
        return promise;
    };
}

export function invalidateCacheKeys(store: Map<string, unknown>, ...keys: string[]) {
    keys.forEach((k) => store.delete(k));
}
