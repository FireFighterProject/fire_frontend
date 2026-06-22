type LoadJob = {
    img: HTMLImageElement;
    url: string;
    attempt: number;
};

const MAX_CONCURRENT = 1;
const START_GAP_MS = 180;
const MAX_RETRIES = 6;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const queue: LoadJob[] = [];
const queuedImgKeys = new Set<string>();
const blobUrlCache = new Map<string, string>();
const inflightFetches = new Map<string, Promise<string>>();
let inflight = 0;
let pumpTimer: number | null = null;
let rateLimitUntil = 0;

function sleep(ms: number) {
    return new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function imgQueueKey(img: HTMLImageElement, url: string) {
    return `${url}::${img.dataset.radarId ?? "x"}`;
}

async function fetchTileObjectUrl(url: string, attempt: number): Promise<string> {
    const cached = blobUrlCache.get(url);
    if (cached) return cached;

    const pending = inflightFetches.get(url);
    if (pending) return pending;

    const task = (async () => {
        const now = Date.now();
        if (now < rateLimitUntil) {
            await sleep(rateLimitUntil - now);
        }

        const res = await fetch(url);

        if (!res.ok) {
            if (res.status === 429) {
                rateLimitUntil = Date.now() + START_GAP_MS * 4 * (attempt + 1);
            }
            if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_RETRIES) {
                const backoff = START_GAP_MS * 2 ** attempt;
                await sleep(backoff);
                return fetchTileObjectUrl(url, attempt + 1);
            }
            throw new Error(`tile ${res.status}`);
        }

        const blob = await res.blob();
        if (!blob.size) {
            throw new Error("tile empty");
        }

        const objectUrl = URL.createObjectURL(blob);
        blobUrlCache.set(url, objectUrl);
        return objectUrl;
    })();

    inflightFetches.set(url, task);
    try {
        return await task;
    } finally {
        inflightFetches.delete(url);
    }
}

function finishJob() {
    inflight = Math.max(0, inflight - 1);
    schedulePump();
}

function schedulePump(delay = START_GAP_MS) {
    if (pumpTimer) return;
    pumpTimer = window.setTimeout(() => {
        pumpTimer = null;
        void pump();
    }, delay);
}

async function pump() {
    while (inflight < MAX_CONCURRENT && queue.length > 0) {
        const job = queue.shift();
        if (!job) break;

        const { img, url, attempt } = job;
        const key = imgQueueKey(img, url);
        queuedImgKeys.delete(key);

        if (img.dataset.radarLoaded === url) continue;
        if (!img.isConnected) continue;

        inflight += 1;

        try {
            const objectUrl = await fetchTileObjectUrl(url, attempt);
            if (!img.isConnected) continue;
            if (img.dataset.radarUrl !== url && img.dataset.radarLoaded) continue;

            img.src = objectUrl;
            img.dataset.radarLoaded = url;
            img.dataset.radarUrl = url;
            img.dispatchEvent(new CustomEvent("radartileloaded", { bubbles: false }));
        } catch {
            if (attempt < MAX_RETRIES && img.isConnected) {
                const backoff = START_GAP_MS * 2 ** (attempt + 1);
                window.setTimeout(() => {
                    if (!queuedImgKeys.has(key)) {
                        queuedImgKeys.add(key);
                        queue.push({ img, url, attempt: attempt + 1 });
                    }
                    schedulePump(backoff);
                }, backoff);
            }
        } finally {
            finishJob();
        }
    }

    if (inflight < MAX_CONCURRENT && queue.length > 0) {
        schedulePump(START_GAP_MS);
    }
}

let radarImgSeq = 0;

/** RainViewer rate-limit(429) 완화 — fetch + blob 캐시로 순차 로드 */
export function enqueueRadarTileLoad(img: HTMLImageElement, url: string) {
    if (!img.dataset.radarId) {
        radarImgSeq += 1;
        img.dataset.radarId = String(radarImgSeq);
    }

    if (img.dataset.radarLoaded === url) return;

    const cached = blobUrlCache.get(url);
    if (cached) {
        img.src = cached;
        img.dataset.radarLoaded = url;
        img.dataset.radarUrl = url;
        img.dispatchEvent(new CustomEvent("radartileloaded", { bubbles: false }));
        return;
    }

    const key = imgQueueKey(img, url);
    if (img.dataset.radarUrl === url && queuedImgKeys.has(key)) return;

    img.dataset.radarUrl = url;
    queuedImgKeys.add(key);
    queue.push({ img, url, attempt: 0 });
    schedulePump(0);
}

export function resetRadarTileLoader() {
    queue.length = 0;
    queuedImgKeys.clear();
    inflightFetches.clear();
    inflight = 0;
    if (pumpTimer) {
        window.clearTimeout(pumpTimer);
        pumpTimer = null;
    }
}

export function clearRadarTileBlobCache() {
    blobUrlCache.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    blobUrlCache.clear();
}

export function getRadarTileCacheSize() {
    return blobUrlCache.size;
}
