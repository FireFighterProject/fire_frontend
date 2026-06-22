const RAINVIEWER_META_URL = "https://api.rainviewer.com/public/weather-maps.json";
const TILE_HOST = "https://tilecache.rainviewer.com";

type RainViewerMeta = {
    host?: string;
    radar?: {
        past?: { time: number; path: string }[];
        nowcast?: { time: number; path: string }[];
    };
};

let cachedPath: { path: string; fetchedAt: number } | null = null;
const CACHE_MS = 10 * 60 * 1000;

export async function fetchLatestRadarTilePath(): Promise<string> {
    if (cachedPath && Date.now() - cachedPath.fetchedAt < CACHE_MS) {
        return cachedPath.path;
    }

    const res = await fetch(RAINVIEWER_META_URL);
    if (!res.ok) throw new Error("레이더 메타 정보를 불러오지 못했습니다.");

    const json = (await res.json()) as RainViewerMeta;
    const host = json.host ?? TILE_HOST;
    const frames = json.radar?.past ?? [];

    if (!frames.length) throw new Error("사용 가능한 레이더 프레임이 없습니다.");

    const latest = frames[frames.length - 1];
    const path = `${host}${latest.path}`;
    cachedPath = { path, fetchedAt: Date.now() };
    return path;
}

export function latLngToTileXY(lat: number, lng: number, zoom: number) {
    const n = 2 ** zoom;
    const x = Math.floor(((lng + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(
        ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
    );
    return { x, y };
}

export function tileXYToLatLngBounds(x: number, y: number, zoom: number) {
    const n = 2 ** zoom;
    const west = (x / n) * 360 - 180;
    const east = ((x + 1) / n) * 360 - 180;
    const north =
        (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
    const south =
        (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI;
    return { north, south, west, east };
}

export function buildRadarTileUrl(path: string, zoom: number, x: number, y: number) {
    return `${path}/256/${zoom}/${x}/${y}/2/1_1.png`;
}

type ProjectionLike = {
    containerPointFromCoords(latlng: {
        getLat(): number;
        getLng(): number;
    }): { x: number; y: number };
};

/** 카카오 지도 레벨 → RainViewer zoom (안정적인 고정 매핑) */
export function mapLevelToRadarZoom(mapLevel: number): number {
    if (mapLevel <= 8) return 7;
    if (mapLevel <= 10) return 6;
    if (mapLevel <= 12) return 5;
    return 4;
}

/**
 * 투영 기준 zoom 보정 + 히스테리시스 — 줌 레벨 튐 방지
 */
export function resolveTileZoom(
    projection: ProjectionLike,
    lat: number,
    lng: number,
    mapLevel: number,
    lockedZoom: number | null = null
): number {
    const kakao = window.kakao;
    const base = mapLevelToRadarZoom(mapLevel);
    let bestZoom = base;

    for (let z = Math.min(7, base + 1); z >= Math.max(4, base - 1); z -= 1) {
        const { x, y } = latLngToTileXY(lat, lng, z);
        const b = tileXYToLatLngBounds(x, y, z);
        const nw = projection.containerPointFromCoords(
            new kakao.maps.LatLng(b.north, b.west)
        );
        const se = projection.containerPointFromCoords(
            new kakao.maps.LatLng(b.south, b.east)
        );
        const size = Math.max(Math.abs(se.x - nw.x), Math.abs(se.y - nw.y));
        if (size >= 80 && size <= 640) {
            bestZoom = z;
            break;
        }
    }

    if (lockedZoom != null && Math.abs(bestZoom - lockedZoom) <= 1) {
        return lockedZoom;
    }

    return bestZoom;
}

function tileRangeAtZoom(
    sw: { getLat(): number; getLng(): number },
    ne: { getLat(): number; getLng(): number },
    zoom: number,
    pad: number
) {
    const tl = latLngToTileXY(ne.getLat(), sw.getLng(), zoom);
    const br = latLngToTileXY(sw.getLat(), ne.getLng(), zoom);
    return {
        minX: tl.x - pad,
        maxX: br.x + pad,
        minY: tl.y - pad,
        maxY: br.y + pad,
        zoom,
    };
}

const MAX_VISIBLE_TILES = 12;

export function getVisibleTileRange(
    _projection: ProjectionLike,
    sw: { getLat(): number; getLng(): number },
    ne: { getLat(): number; getLng(): number },
    preferredZoom: number
) {
    const pad = 1;

    for (let z = preferredZoom; z >= 4; z -= 1) {
        const range = tileRangeAtZoom(sw, ne, z, pad);
        const count =
            (range.maxX - range.minX + 1) * (range.maxY - range.minY + 1);
        if (count <= MAX_VISIBLE_TILES) return range;
    }

    return tileRangeAtZoom(sw, ne, 4, 0);
}

/** 화면 중심에 가까운 타일부터 로드 */
export function sortTilesByCenter(
    tiles: { x: number; y: number }[],
    centerX: number,
    centerY: number
) {
    return [...tiles].sort((a, b) => {
        const da = (a.x - centerX) ** 2 + (a.y - centerY) ** 2;
        const db = (b.x - centerX) ** 2 + (b.y - centerY) ** 2;
        return da - db;
    });
}

export function positionRadarTile(
    img: HTMLImageElement,
    projection: ProjectionLike,
    zoom: number,
    x: number,
    y: number
) {
    const kakao = window.kakao;
    const b = tileXYToLatLngBounds(x, y, zoom);
    const nw = projection.containerPointFromCoords(
        new kakao.maps.LatLng(b.north, b.west)
    );
    const se = projection.containerPointFromCoords(
        new kakao.maps.LatLng(b.south, b.east)
    );

    const left = Math.floor(nw.x) - 1;
    const top = Math.floor(nw.y) - 1;
    const width = Math.ceil(se.x - nw.x) + 3;
    const height = Math.ceil(se.y - nw.y) + 3;

    img.style.width = `${Math.max(1, width)}px`;
    img.style.height = `${Math.max(1, height)}px`;
    img.style.transform = `translate3d(${left}px, ${top}px, 0)`;
}

export function applyRadarTileStyle(img: HTMLImageElement) {
    img.style.position = "absolute";
    img.style.left = "0";
    img.style.top = "0";
    img.style.margin = "0";
    img.style.padding = "0";
    img.style.border = "0";
    img.style.display = "block";
    img.style.opacity = "0";
    img.style.transition = "opacity 0.35s ease";
    img.style.pointerEvents = "none";
    img.style.imageRendering = "auto";
    img.style.backfaceVisibility = "hidden";
    img.style.willChange = "transform, opacity";
    img.decoding = "async";
}

export function markRadarTileVisible(img: HTMLImageElement) {
    img.style.opacity = "0.5";
}

/** 레이더 ON 시 카카오 지도 최대 축소 레벨 (1=근접, 14=최대 광역) */
export const RADAR_VIEW_LEVEL = 14;
export const RADAR_LEVEL_MIN = 7;
export const RADAR_LEVEL_MAX = 14;

export const KOREA_RADAR_BOUNDS = {
    minLat: 33.1,
    maxLat: 38.6,
    minLng: 124.6,
    maxLng: 131.9,
};

export const KOREA_RADAR_CENTER = {
    lat: 36.3,
    lng: 127.8,
    name: "대한민국",
};

export function isInKoreaRadarCoverage(lat: number, lng: number) {
    return (
        lat >= KOREA_RADAR_BOUNDS.minLat &&
        lat <= KOREA_RADAR_BOUNDS.maxLat &&
        lng >= KOREA_RADAR_BOUNDS.minLng &&
        lng <= KOREA_RADAR_BOUNDS.maxLng
    );
}
