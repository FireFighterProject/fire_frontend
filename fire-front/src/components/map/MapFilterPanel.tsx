// src/components/map/MapFilterPanel.tsx
import React, { useEffect, useState } from "react";
import type { Filters, Vehicle } from "../../types/map";
import apiClient from "../../api/axios";

type FireStationDto = {
    id: number;
    sido: string;
    name: string;
    address: string;
};

type Props = {
    top: number;
    data: Vehicle[]; // 부모에서 이미 보내고 있으니까 타입은 유지
    options: { sidos: string[]; stations: string[]; types: string[] };
    filters: Filters;
    onChangeFilter: (k: keyof Filters, v: string) => void;
    onReset: () => void;
    onRefresh: () => void;
};

const MapFilterPanel: React.FC<Props> = ({
    top,
    data,
    options,
    filters,
    onChangeFilter,
    onReset,
    onRefresh,
}) => {
    // 🔹 data 안 쓰고 있어서 ESLint 경고 뜨니까, 이렇게 한 번 "사용" 처리
    void data;

    // 🔥 /api/fire-stations 에서 가져온 소방서 이름 목록
    const [stationOptions, setStationOptions] = useState<string[]>([]);
    const [loadingStations, setLoadingStations] = useState(false);

    // 시/도 바뀔 때마다 소방서 목록 다시 불러오기
    useEffect(() => {
        const fetchStations = async () => {
            try {
                setLoadingStations(true);

                // 🔹 응답 타입을 FireStationDto[] 로 명시
                const res = await apiClient.get<FireStationDto[]>("/fire-stations", {
                    params: filters.sido ? { sido: filters.sido } : undefined,
                });

                const stations = res.data ?? [];

                // 🔹 Set<string> 을 써서 Array.from 결과 타입을 string[] 로 고정
                const names: string[] = Array.from(
                    new Set<string>(stations.map((s) => s.name))
                );

                setStationOptions(names);

                // 현재 선택된 station 이 새 목록에 없으면 초기화
                if (filters.station && !names.includes(filters.station)) {
                    onChangeFilter("station", "");
                }
            } catch (e) {
                console.error("🔥 /api/fire-stations 조회 실패", e);
                setStationOptions([]);
            } finally {
                setLoadingStations(false);
            }
        };

        fetchStations();
    }, [filters.sido, filters.station, onChangeFilter]);

    return (
        <div
            className="fixed right-30 z-40 grid gap-2 rounded-lg bg-white/95 p-3 shadow-lg ring-1 ring-gray-200
                 grid-cols-1 sm:grid-cols-3 items-center"
            style={{ top }}
        >
            {/* 시/도 필터 */}
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

            {/* 소방서 필터 – 🔥 백엔드에서 가져온 stationOptions 사용 */}
            <label className="text-xs text-gray-700">
                소방서
                <select
                    value={filters.station}
                    onChange={(e) => onChangeFilter("station", e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">
                        {loadingStations ? "소방서 불러오는 중..." : "전체"}
                    </option>
                    {!loadingStations &&
                        stationOptions.map((st) => (
                            <option key={st} value={st}>
                                {st}
                            </option>
                        ))}
                </select>
            </label>

            {/* 차종 필터 */}
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

            {/* 버튼 영역 */}
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

export default MapFilterPanel;
