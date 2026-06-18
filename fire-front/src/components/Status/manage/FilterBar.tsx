// src/components/manage/FilterBar.tsx
import { useEffect, useState } from "react";
import type { Vehicle } from "../../../types/vehicle";

export type FilterQuery = {
    sido: string;
    stationId: string | number | "";
    status: string | number | "";
    typeName: string;
    callSign: string;
};

export type FireStation = {
    id: number;
    sido: string;
    name: string;
};

type Props = {
    rows: Vehicle[];
    query: FilterQuery;
    setQuery: (q: FilterQuery) => void;
    allStations: FireStation[];
};

export default function FilterBar({ rows, query, setQuery, allStations }: Props) {
    const [tempQuery, setTempQuery] = useState<FilterQuery>({
        ...query,
        sido: query.sido ?? "",
    });

    const [sidoList, setSidoList] = useState<string[]>([]);
    const [selectedSido, setSelectedSido] = useState<string>(query.sido ?? "");
    const [stations, setStations] = useState<FireStation[]>([]);
    const [selectedStationName, setSelectedStationName] = useState<string>("");

    // query 갱신 → tempQuery에도 반영
    useEffect(() => {
        setTempQuery((prev) => ({ ...prev, ...query }));
        setSelectedSido(query.sido || "");
    }, [query]);

    // 🔥 rows에서 시도 목록 추출
    useEffect(() => {
        const sidos = Array.from(
            new Set(rows.map((r) => r.sido).filter((v): v is string => Boolean(v)))
        );
        setSidoList(sidos);
    }, [rows]);

    // 🔥 시도 선택
    const handleSidoChange = (value: string) => {
        setSelectedSido(value);
        setSelectedStationName("");

        if (!value) {
            // 전체 초기화
            setStations([]);
            setTempQuery((q) => ({ ...q, sido: "", stationId: "" }));
            return;
        }

        // 해당 시도의 소방서만 표시
        const filtered = allStations.filter((s) => s.sido === value);
        setStations(filtered);

        setTempQuery((q) => ({ ...q, sido: value, stationId: "" }));
    };

    // 🔥 소방서 선택
    const handleStationChange = (name: string) => {
        setSelectedStationName(name);

        const found = stations.find((s) => s.name === name);
        setTempQuery((q) => ({
            ...q,
            stationId: found?.id ?? "",
        }));
    };

    const applyFilters = () => {
        setQuery(tempQuery);
    };

    return (
        <div className="flex flex-wrap gap-4 items-end p-2">

            {/* 시도 */}
            <div className="flex flex-col">
                <label className="text-xs text-gray-500">시도</label>
                <select
                    className="border rounded px-2 py-1 w-36"
                    value={selectedSido}
                    onChange={(e) => handleSidoChange(e.target.value)}
                >
                    <option value="">전체</option>
                    {sidoList.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>

            {/* 소방서 */}
            <div className="flex flex-col">
                <label className="text-xs text-gray-500">소방서</label>
                <select
                    className="border rounded px-2 py-1 w-40"
                    value={selectedStationName}
                    disabled={!selectedSido}
                    onChange={(e) => handleStationChange(e.target.value)}
                >
                    <option value="">전체</option>
                    {stations.map((s) => (
                        <option key={s.id} value={s.name}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* 상태 */}
            <div className="flex flex-col">
                <label className="text-xs text-gray-500">상태</label>
                <select
                    className="border rounded px-2 py-1 w-32"
                    value={tempQuery.status}
                    onChange={(e) =>
                        setTempQuery((q) => ({
                            ...q,
                            status: e.target.value === "" ? "" : Number(e.target.value),
                        }))
                    }
                >
                    <option value="">전체</option>
                    <option value={0}>대기</option>
                    <option value={1}>활동</option>
                    <option value={2}>복귀중</option>
                    <option value={3}>집결중</option>
                </select>
            </div>

            {/* 차종 */}
            <div className="flex flex-col">
                <label className="text-xs text-gray-500">차종</label>
                <input
                    className="border rounded px-2 py-1 w-36"
                    value={tempQuery.typeName}
                    onChange={(e) =>
                        setTempQuery((q) => ({ ...q, typeName: e.target.value }))
                    }
                    placeholder="예: 펌프차"
                />
            </div>

            {/* 호출명 */}
            <div className="flex flex-col">
                <label className="text-xs text-gray-500">호출명</label>
                <input
                    className="border rounded px-2 py-1 w-48"
                    value={tempQuery.callSign}
                    onChange={(e) =>
                        setTempQuery((q) => ({ ...q, callSign: e.target.value }))
                    }
                    placeholder="예: 강남-01"
                />
            </div>

            {/* 적용 버튼 */}
            <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded shadow text-sm"
            >
                적용
            </button>
        </div>
    );
}
