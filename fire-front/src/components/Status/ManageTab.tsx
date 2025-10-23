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
    status: number;     // 0:대기, 1:활동, 2:철수(가정)
    rallyPoint: number; // 0/1
};

/** ============== UI 행 타입 ============== 
 * 기존 Vehicle과 유사하게 유지하되, API에 없는 값은 optional
 */
type Row = {
    id: string;              // 테이블 key용 (string)
    stationId: number;
    sido: string;
    station?: string;        // API에 없음
    type: string;            // = typeName
    callname: string;        // = callSign
    capacity?: number | "";  // API에 없음
    personnel?: number | ""; // API에 없음
    avl?: string;            // API에 없음
    pslte?: string;          // API에 없음
    status: "대기" | "활동" | "철수";
    rally: boolean;          // = rallyPoint
};

/** 상태 코드 <-> 라벨 변환 */
const statusCodeToLabel = (code: number): Row["status"] => {
    if (code === 1) return "활동";
    if (code === 2) return "철수";
    return "대기";
};
const statusLabelToCode = (label: Row["status"]): number => {
    if (label === "활동") return 1;
    if (label === "철수") return 2;
    return 0;
};

/** API Base (필요시 .env로 빼세요) */
const API_BASE = "http://172.28.2.191:8081";

/** 쿼리 파라미터 타입 */
type Query = {
    stationId?: number | "";
    status?: number | "";
    typeName?: string;
    callSignLike?: string; // 백엔드가 callSignLike인지 callSign인지에 맞춰 조정
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
        stationId: 1, // 예시 기본값
        status: "",   // 전체
        typeName: "",
        callSignLike: "",
    });

    const headers = useMemo(
        () => ["연번", "시도", "소방서", "차종", "호출명", "용량", "인원", "AVL", "PS-LTE", "상태", "자원집결지", "수정"],
        []
    );

    /** API 호출 */
    const fetchVehicles = async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, any> = {};
            if (query.stationId !== "" && query.stationId != null) params.stationId = query.stationId;
            if (query.status !== "" && query.status != null) params.status = query.status;
            if (query.typeName) params.typeName = query.typeName;
            // 스웨거 문구가 혼재되어 있어 둘 다 시도—백엔드에 맞춰 하나만 남기세요.
            if (query.callSignLike) {
                params.callSignLike = query.callSignLike;
                params.callSign = undefined;
            }

            const res = await axios.get<ApiVehicle[]>(`${API_BASE}/api/vehicles`, { params });
            const mapped: Row[] = res.data.map((v) => ({
                id: String(v.id),
                stationId: v.stationId,
                sido: v.sido ?? "",
                station: "", // 백엔드 확정되면 매핑
                type: v.typeName ?? "",
                callname: v.callSign ?? "",
                capacity: "",
                personnel: "",
                avl: "",
                pslte: "",
                status: statusCodeToLabel(v.status ?? 0),
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
        // 초기 로드
        fetchVehicles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startEdit = (row: Row) => {
        setEditRowId(row.id);
        setEditData(row);
    };

    const cancelEdit = () => {
        setEditRowId(null);
        setEditData({});
    };

    const saveEdit = () => {
        // 현재는 로컬만 갱신 (PATCH 연동 원하면 알려주세요)
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
                <div className="flex flex-col">
                    <label className="text-xs text-gray-500">stationId</label>
                    <input
                        type="number"
                        className="border px-2 py-1 rounded w-36"
                        value={query.stationId ?? ""}
                        onChange={(e) =>
                            setQuery((q) => ({ ...q, stationId: e.target.value === "" ? "" : Number(e.target.value) }))
                        }
                        placeholder="예: 1"
                    />
                </div>

                <div className="flex flex-col">
                    <label className="text-xs text-gray-500">status</label>
                    <select
                        className="border px-2 py-1 rounded w-36"
                        value={query.status === "" ? "" : query.status}
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

                <div className="flex flex-col">
                    <label className="text-xs text-gray-500">typeName</label>
                    <input
                        className="border px-2 py-1 rounded w-40"
                        value={query.typeName ?? ""}
                        onChange={(e) => setQuery((q) => ({ ...q, typeName: e.target.value }))}
                        placeholder="예: 펌프차"
                    />
                </div>

                <div className="flex flex-col">
                    <label className="text-xs text-gray-500">callSignLike</label>
                    <input
                        className="border px-2 py-1 rounded w-48"
                        value={query.callSignLike ?? ""}
                        onChange={(e) => setQuery((q) => ({ ...q, callSignLike: e.target.value }))}
                        placeholder="예: 서울-펌프"
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

                                        {/* 소방서 (API 미제공) */}
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    value={editData.station ?? ""}
                                                    onChange={(e) => handleEditChange("station", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                    placeholder="(API 미제공)"
                                                />
                                            ) : (
                                                r.station || "-"
                                            )}
                                        </Td>

                                        {/* 차종 (typeName) */}
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

                                        {/* 호출명 (callSign) */}
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

                                        {/* 용량 (미제공) */}
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

                                        {/* 인원 (미제공) */}
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

                                        {/* AVL (미제공) */}
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    value={editData.avl ?? ""}
                                                    onChange={(e) => handleEditChange("avl", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                    placeholder="-"
                                                />
                                            ) : (
                                                r.avl ?? "-"
                                            )}
                                        </Td>

                                        {/* PS-LTE (미제공) */}
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    value={editData.pslte ?? ""}
                                                    onChange={(e) => handleEditChange("pslte", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                    placeholder="-"
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
                                                    <option value="활동">활동</option>
                                                    <option value="대기">대기</option>
                                                    <option value="철수">철수</option>
                                                </select>
                                            ) : (
                                                r.status
                                            )}
                                        </Td>

                                        {/* 자원집결지 */}
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

                                        {/* 액션 */}
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
