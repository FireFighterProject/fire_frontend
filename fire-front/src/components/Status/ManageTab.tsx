// src/pages/ManageTab.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/** ============== API 타입 ============== */
type ApiVehicle = {
    id: number;
    stationId: number;
    sido: string;
    typeName: string;
    callSign: string;
    status: number;     // 0:대기, 1:활동, 2:철수
    rallyPoint: number; // 0/1
};

/** ============== UI 행 타입 ============== */
type Row = {
    id: string;              // key
    stationId: number;
    sido: string;
    station?: string;
    type: string;
    callname: string;
    capacity?: number | "";
    personnel?: number | "";
    avl?: string;
    pslte?: string;
    status: "대기" | "활동" | "철수";
    rally: boolean;
};

/** 상태 코드 → 라벨 */
const statusCodeToLabel = (code: number): Row["status"] =>
    code === 1 ? "활동" : code === 2 ? "철수" : "대기";

/** API BASE URL */
const API_BASE = "http://172.28.2.191:8081";

/** 쿼리 파라미터 (Swagger 기준) */
type Query = {
    stationId?: number | "";
    status?: number | "";
    typeName?: string;
    callSignLike?: string;
};

function ManageTab() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 수정 상태
    const [editRowId, setEditRowId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Row>>({});

    // 필터 상태
    const [query, setQuery] = useState<Query>({
        stationId: 1,
        status: "",
        typeName: "",
        callSignLike: "",
    });

    const headers = useMemo(
        () => ["연번", "시도", "소방서", "차종", "호출명", "용량", "인원", "AVL", "PS-LTE", "상태", "자원집결지", "수정"],
        []
    );

    /** =================== API 호출 =================== */
    const fetchVehicles = async () => {
        setLoading(true);
        setError(null);

        try {
            const params: Record<string, any> = {};

            if (query.stationId !== "" && query.stationId != null) params.stationId = query.stationId;
            if (query.status !== "" && query.status != null) params.status = query.status;
            if (query.typeName) params.typeName = query.typeName;
            if (query.callSignLike) params.callSignLike = query.callSignLike;

            const res = await axios.get<ApiVehicle[]>(`${API_BASE}/api/vehicles`, { params });

            const mapped: Row[] = res.data.map((v) => ({
                id: String(v.id),
                stationId: v.stationId,
                sido: v.sido ?? "",
                station: "", // 백엔드에서 station 이름 제공 시 매핑 예정
                type: v.typeName ?? "",
                callname: v.callSign ?? "",
                capacity: "",
                personnel: "",
                avl: "",
                pslte: "",
                status: statusCodeToLabel(v.status),
                rally: (v.rallyPoint ?? 0) === 1,
            }));

            setRows(mapped);
        } catch (e: any) {
            setError(e?.message || "목록 조회 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    /** =================== 수정 기능 =================== */
    const startEdit = (row: Row) => {
        setEditRowId(row.id);
        setEditData(row);
    };

    const cancelEdit = () => {
        setEditRowId(null);
        setEditData({});
    };

    const saveEdit = () => {
        // (백엔드 PATCH 연동 필요 시 말해줘!)
        setRows((prev) => prev.map((r) => (r.id === editRowId ? { ...r, ...editData } as Row : r)));
        cancelEdit();
    };

    const handleEditChange = <K extends keyof Row>(field: K, value: Row[K]) => {
        setEditData((prev) => ({ ...prev, [field]: value }));
    };

    const onSearch = () => {
        fetchVehicles();
    };

    return (
        <div className="p-6 space-y-4">
            <h3 className="font-semibold">등록 차량 리스트</h3>

            {/* 필터 영역 */}
            <div className="flex flex-wrap gap-2 items-end">

                {/* stationId */}
                <div className="flex flex-col">
                    <label className="text-xs text-gray-500">stationId</label>
                    <input
                        type="number"
                        className="border px-2 py-1 rounded w-36"
                        value={query.stationId ?? ""}
                        onChange={(e) =>
                            setQuery((q) => ({
                                ...q,
                                stationId: e.target.value === "" ? "" : Number(e.target.value),
                            }))
                        }
                    />
                </div>

                {/* status */}
                <div className="flex flex-col">
                    <label className="text-xs text-gray-500">status</label>
                    <select
                        className="border px-2 py-1 rounded w-36"
                        value={query.status}
                        onChange={(e) =>
                            setQuery((q) => ({
                                ...q,
                                status: e.target.value === "" ? "" : Number(e.target.value),
                            }))
                        }
                    >
                        <option value="">전체</option>
                        <option value={0}>대기</option>
                        <option value={1}>활동</option>
                        <option value={2}>철수</option>
                    </select>
                </div>

                {/* typeName */}
                <div className="flex flex-col">
                    <label className="text-xs text-gray-500">typeName</label>
                    <input
                        className="border px-2 py-1 rounded w-40"
                        value={query.typeName ?? ""}
                        onChange={(e) => setQuery((q) => ({ ...q, typeName: e.target.value }))}
                        placeholder="예: 펌프차"
                    />
                </div>

                {/* callSignLike */}
                <div className="flex flex-col">
                    <label className="text-xs text-gray-500">callSignLike</label>
                    <input
                        className="border px-2 py-1 rounded w-48"
                        value={query.callSignLike ?? ""}
                        onChange={(e) => setQuery((q) => ({ ...q, callSignLike: e.target.value }))}
                        placeholder="예: 강남소방서"
                    />
                </div>

                <button
                    onClick={onSearch}
                    className="px-3 py-2 rounded border text-sm bg-blue-600 text-white hover:bg-blue-700"
                >
                    조회
                </button>

                {loading && <span className="text-sm text-gray-500">불러오는 중…</span>}
                {error && <span className="text-sm text-red-600">{error}</span>}
            </div>

            {/* ======================== 테이블 ======================== */}
            <div className="overflow-auto border border-gray-200 rounded bg-white">
                <table className="min-w-[900px] w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
                            {headers.map((h) => (
                                <th key={h}>{h}</th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={headers.length} className="px-3 py-10 text-center text-gray-500">
                                    {loading ? "불러오는 중…" : "등록된 차량이 없습니다."}
                                </td>
                            </tr>
                        ) : (
                            rows.map((r, idx) => {
                                const isEditing = editRowId === r.id;
                                return (
                                    <tr key={r.id} className="even:bg-gray-50/40">
                                        <Td>{idx + 1}</Td>

                                        {/* 시도 */}
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    value={editData.sido ?? ""}
                                                    onChange={(e) => handleEditChange("sido", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                />
                                            ) : (
                                                r.sido || "-"
                                            )}
                                        </Td>

                                        {/* 소방서 */}
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    value={editData.station ?? ""}
                                                    onChange={(e) => handleEditChange("station", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                    placeholder="-"
                                                />
                                            ) : (
                                                r.station || "-"
                                            )}
                                        </Td>

                                        {/* 차종 */}
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    value={editData.type ?? ""}
                                                    onChange={(e) => handleEditChange("type", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                />
                                            ) : (
                                                r.type
                                            )}
                                        </Td>

                                        {/* 호출명 */}
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    value={editData.callname ?? ""}
                                                    onChange={(e) => handleEditChange("callname", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                />
                                            ) : (
                                                r.callname
                                            )}
                                        </Td>

                                        {/* 용량 */}
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editData.capacity ?? ""}
                                                    onChange={(e) =>
                                                        handleEditChange("capacity", e.target.value === "" ? "" : Number(e.target.value))
                                                    }
                                                    className="border px-2 py-1 rounded w-full"
                                                    placeholder="-"
                                                />
                                            ) : (
                                                r.capacity ?? "-"
                                            )}
                                        </Td>

                                        {/* 인원 */}
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editData.personnel ?? ""}
                                                    onChange={(e) =>
                                                        handleEditChange("personnel", e.target.value === "" ? "" : Number(e.target.value))
                                                    }
                                                    className="border px-2 py-1 rounded w-full"
                                                    placeholder="-"
                                                />
                                            ) : (
                                                r.personnel ?? "-"
                                            )}
                                        </Td>

                                        {/* AVL */}
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    value={editData.avl ?? ""}
                                                    onChange={(e) => handleEditChange("avl", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                />
                                            ) : (
                                                r.avl ?? "-"
                                            )}
                                        </Td>

                                        {/* PS-LTE */}
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    value={editData.pslte ?? ""}
                                                    onChange={(e) => handleEditChange("pslte", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                />
                                            ) : (
                                                r.pslte ?? "-"
                                            )}
                                        </Td>

                                        {/* 상태 */}
                                        <Td>
                                            {isEditing ? (
                                                <select
                                                    value={(editData.status as Row["status"]) ?? r.status}
                                                    onChange={(e) => handleEditChange("status", e.target.value as Row["status"])}
                                                    className="border px-2 py-1 rounded"
                                                >
                                                    <option value="대기">대기</option>
                                                    <option value="활동">활동</option>
                                                    <option value="철수">철수</option>
                                                </select>
                                            ) : (
                                                r.status
                                            )}
                                        </Td>

                                        {/* 집결지 */}
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    type="checkbox"
                                                    checked={!!editData.rally}
                                                    onChange={(e) => handleEditChange("rally", e.target.checked)}
                                                />
                                            ) : (
                                                <input type="checkbox" checked={!!r.rally} disabled />
                                            )}
                                        </Td>

                                        {/* 수정버튼 */}
                                        <Td>
                                            {isEditing ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={saveEdit}
                                                        className="px-2 py-1 rounded border text-xs bg-green-500 text-white hover:bg-green-600"
                                                    >
                                                        저장
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="px-2 py-1 rounded border text-xs hover:bg-gray-50"
                                                    >
                                                        취소
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEdit(r)}
                                                    className="px-2 py-1 rounded border text-xs hover:bg-gray-50"
                                                >
                                                    수정
                                                </button>
                                            )}
                                        </Td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Td({ children }: { children: React.ReactNode }) {
    return <td className="px-3 py-2 border-t border-gray-100 whitespace-nowrap">{children}</td>;
}

export default ManageTab;
