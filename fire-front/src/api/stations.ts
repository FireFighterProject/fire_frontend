import api from "./axios";
import type { ApiFireStation } from "./types";
import { SIDO_OPTIONS } from "../services/Register/utils";
import { createCachedFetcher } from "../services/cache/simpleCache";

const STATIONS_TTL_MS = 5 * 60 * 1000;
const ALL_STATIONS_KEY = "__all_merged__";

const fetchStationsByKey = createCachedFetcher(async (key: string) => {
    if (key === ALL_STATIONS_KEY) {
        const batches = await Promise.all(
            SIDO_OPTIONS.map((sido) => fetchFireStationsUncached(sido))
        );
        const byId = new Map<number, ApiFireStation>();
        batches.flat().forEach((s) => byId.set(s.id, s));
        return Array.from(byId.values());
    }

    const res = await api.get<ApiFireStation[]>("/fire-stations", {
        params: key ? { sido: key } : undefined,
    });
    return res.data ?? [];
}, STATIONS_TTL_MS);

async function fetchFireStationsUncached(sido?: string): Promise<ApiFireStation[]> {
    const res = await api.get<ApiFireStation[]>("/fire-stations", {
        params: sido ? { sido } : undefined,
    });
    return res.data ?? [];
}

export async function fetchFireStations(sido?: string): Promise<ApiFireStation[]> {
    return fetchStationsByKey(sido ?? "");
}

/** 시도별 조회 후 병합 (GET /fire-stations 는 sido 파라미터 필수) */
export async function fetchAllFireStations(): Promise<ApiFireStation[]> {
    return fetchStationsByKey(ALL_STATIONS_KEY);
}

export async function fetchFireStation(id: number): Promise<ApiFireStation> {
    const res = await api.get<ApiFireStation>(`/fire-stations/${id}`);
    return res.data;
}

export async function fetchFireStationMap(): Promise<Map<number, ApiFireStation>> {
    const stations = await fetchAllFireStations();
    return new Map(stations.map((s) => [s.id, s]));
}

export async function fetchFireStationNameMap(): Promise<Map<number, string>> {
    const stations = await fetchAllFireStations();
    return new Map(stations.map((s) => [s.id, s.name]));
}

export async function fetchStationsByIds(
    ids: number[],
    cache: Record<number, ApiFireStation> = {}
): Promise<Record<number, ApiFireStation>> {
    const unique = Array.from(new Set(ids));
    const need = unique.filter((id) => !cache[id]);

    const fetched = await Promise.all(
        need.map(async (id) => {
            const station = await fetchFireStation(id);
            return [id, station] as const;
        })
    );

    const next = { ...cache };
    fetched.forEach(([id, station]) => {
        next[id] = station;
    });
    return next;
}
