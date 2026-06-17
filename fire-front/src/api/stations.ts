import api from "./axios";
import type { ApiFireStation } from "./types";
import { SIDO_OPTIONS } from "../services/Register/utils";

export async function fetchFireStations(sido?: string): Promise<ApiFireStation[]> {
    const res = await api.get<ApiFireStation[]>("/fire-stations", {
        params: sido ? { sido } : undefined,
    });
    return res.data ?? [];
}

/** 시도별 조회 후 병합 (GET /fire-stations 는 sido 파라미터 필수) */
export async function fetchAllFireStations(): Promise<ApiFireStation[]> {
    const batches = await Promise.all(
        SIDO_OPTIONS.map((sido) => fetchFireStations(sido))
    );
    const byId = new Map<number, ApiFireStation>();
    batches.flat().forEach((s) => byId.set(s.id, s));
    return Array.from(byId.values());
}

export async function fetchFireStation(id: number): Promise<ApiFireStation> {
    const res = await api.get<ApiFireStation>(`/fire-stations/${id}`);
    return res.data;
}

export async function fetchFireStationMap(): Promise<Map<number, ApiFireStation>> {
    const stations = await fetchFireStations();
    return new Map(stations.map((s) => [s.id, s]));
}

export async function fetchFireStationNameMap(): Promise<Map<number, string>> {
    const stations = await fetchFireStations();
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
