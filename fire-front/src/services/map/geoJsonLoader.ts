type GeoFeatureCollection = {
    features: unknown[];
};

let sidoPromise: Promise<GeoFeatureCollection> | null = null;
let sigPromise: Promise<GeoFeatureCollection> | null = null;

/** 시도 경계 GeoJSON — MapPage 진입 시에만 로드 */
export function loadSidoGeoJson(): Promise<GeoFeatureCollection> {
    if (!sidoPromise) {
        sidoPromise = import("../../data/sido.json").then((m) => m.default as GeoFeatureCollection);
    }
    return sidoPromise;
}

/** 시군구 경계 GeoJSON — 줌 레벨 ≤10 일 때만 로드 */
export function loadSigGeoJson(): Promise<GeoFeatureCollection> {
    if (!sigPromise) {
        sigPromise = import("../../data/sig.json").then((m) => m.default as GeoFeatureCollection);
    }
    return sigPromise;
}

export async function loadGeoJsonForZoom(level: number): Promise<GeoFeatureCollection> {
    return level <= 10 ? loadSigGeoJson() : loadSidoGeoJson();
}
