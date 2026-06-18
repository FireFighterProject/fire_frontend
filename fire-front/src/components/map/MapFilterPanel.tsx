// src/components/map/MapFilterPanel.tsx
import React, { memo, useEffect, useState } from "react";
import type { Filters, Vehicle } from "../../types/map";
import { fetchFireStations } from "../../api/stations";

type Props = {
    top: number;
    data: Vehicle[];
    options: { sidos: string[]; stations: string[]; types: string[] };
    filters: Filters;
    onChangeFilter: (k: keyof Filters, v: string) => void;
    onReset: () => void;
    onRefresh: () => void;
};

const MapFilterPanel: React.FC<Props> = ({
    top,
    data: _data,
    options,
    filters,
    onChangeFilter,
    onReset,
    onRefresh,
}) => {
    void _data;

    const [stationOptions, setStationOptions] = useState<string[]>([]);
    const [loadingStations, setLoadingStations] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const loadStations = async () => {
            try {
                setLoadingStations(true);
                const stations = await fetchFireStations(filters.sido || undefined);
                if (cancelled) return;

                const names = Array.from(new Set(stations.map((s) => s.name)));
                setStationOptions(names);

                if (filters.station && !names.includes(filters.station)) {
                    onChangeFilter("station", "");
                }
            } catch (e) {
                console.error("/api/fire-stations 조회 실패", e);
                if (!cancelled) setStationOptions([]);
            } finally {
                if (!cancelled) setLoadingStations(false);
            }
        };

        loadStations();
        return () => {
            cancelled = true;
        };
    }, [filters.sido, filters.station, onChangeFilter]);

    return (
        <div
            className="fixed right-30 z-40 grid gap-2 w-[410px] rounded-lg bg-white/95 p-3 shadow-lg ring-1 ring-gray-200
               grid-cols-1 sm:grid-cols-3 items-center"
            style={{ top }}
        >
            <label className="text-xs text-gray-700">
                지역(시/도)
                <select
                    value={filters.sido}
                    onChange={(e) => onChangeFilter("sido", e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">전체</option>
                    {options.sidos.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
            </label>

            <label className="text-xs text-gray-700">
                소방서
                <select
                    value={filters.station}
                    onChange={(e) => onChangeFilter("station", e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">
                        {loadingStations ? "불러오는중" : "전체"}
                    </option>
                    {!loadingStations &&
                        stationOptions.map((st) => (
                            <option key={st} value={st}>
                                {st}
                            </option>
                        ))}
                </select>
            </label>

            <label className="text-xs text-gray-700">
                차종
                <select
                    value={filters.type}
                    onChange={(e) => onChangeFilter("type", e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">전체</option>
                    {options.types.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
            </label>

            <div className="sm:col-span-3 flex gap-2">
                <button
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                    onClick={onReset}
                >
                    필터 초기화
                </button>
                <button
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                    onClick={onRefresh}
                >
                    화면 새로고침
                </button>
            </div>
        </div>
    );
};

export default memo(MapFilterPanel);
