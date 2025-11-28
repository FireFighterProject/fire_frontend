// src/components/manage/VehicleTable.tsx
import React, { useEffect, useMemo } from "react";
import Td from "./Td";

export default function VehicleTable({
    rows,
    allStations,
    loading,
    editRowId,
    editData,
    setEditData,
    setEditRowId,
    saveEdit,
}) {
    allStations = allStations || [];

    const mappedRows = useMemo(() => {
        return rows.map((r) => {
            const found = allStations.find(
                (s) => Number(s.id) === Number(r.stationId)
            );
            return {
                ...r,
                station: found?.name ?? "-",
            };
        });
    }, [rows, allStations]);

    const handleEditChange = (field: string, value: any) => {
        setEditData((prev: any) => ({ ...prev, [field]: value }));
    };

    const headers = [
        "연번",
        "시도",
        "소방서",
        "차종",
        "호출명",
        "용량",
        "인원",
        "AVL",
        "PS-LTE",
        "상태",
        "집결",
        "수정",
    ];

    return (
        <div className="overflow-auto border rounded bg-white">
            <table className="min-w-[900px] text-sm w-full">
                <thead className="bg-gray-50">
                    <tr>
                        {headers.map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-semibold">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {mappedRows.length === 0 ? (
                        <tr>
                            <td colSpan={headers.length}
                                className="text-center py-10 text-gray-500">
                                {loading ? "불러오는 중..." : "등록된 차량이 없습니다."}
                            </td>
                        </tr>
                    ) : (
                        mappedRows.map((r, idx) => {
                            const isEditing = r.id === editRowId;

                            return (
                                <tr key={r.id} className="even:bg-gray-50/40">
                                    <Td>{idx + 1}</Td>

                                    <Td>
                                        {isEditing ? (
                                            <input
                                                value={editData.sido ?? ""}
                                                onChange={(e) =>
                                                    handleEditChange("sido", e.target.value)
                                                }
                                                className="border px-2 py-1 rounded w-full"
                                            />
                                        ) : r.sido}
                                    </Td>

                                    <Td>{r.station}</Td>

                                    <Td>
                                        {isEditing ? (
                                            <input
                                                value={editData.type ?? ""}
                                                onChange={(e) =>
                                                    handleEditChange("type", e.target.value)
                                                }
                                                className="border px-2 py-1 rounded w-full"
                                            />
                                        ) : r.type}
                                    </Td>

                                    <Td>
                                        {isEditing ? (
                                            <input
                                                value={editData.callname ?? ""}
                                                onChange={(e) =>
                                                    handleEditChange("callname", e.target.value)
                                                }
                                                className="border px-2 py-1 rounded w-full"
                                            />
                                        ) : r.callname}
                                    </Td>

                                    <Td>
                                        {isEditing ? (
                                            <input
                                                value={editData.capacity ?? ""}
                                                onChange={(e) =>
                                                    handleEditChange("capacity", e.target.value)
                                                }
                                                className="border px-2 py-1 rounded w-full"
                                            />
                                        ) : r.capacity}
                                    </Td>

                                    <Td>
                                        {isEditing ? (
                                            <input
                                                value={editData.personnel ?? ""}
                                                onChange={(e) =>
                                                    handleEditChange("personnel", e.target.value)
                                                }
                                                className="border px-2 py-1 rounded w-full"
                                            />
                                        ) : r.personnel}
                                    </Td>

                                    <Td>
                                        {isEditing ? (
                                            <input
                                                value={editData.avl ?? ""}
                                                onChange={(e) =>
                                                    handleEditChange("avl", e.target.value)
                                                }
                                                className="border px-2 py-1 rounded w-full"
                                            />
                                        ) : r.avl}
                                    </Td>

                                    {/* ⛔ PS-LTE 수정 불가능 */}
                                    <Td>{r.pslte}</Td>

                                    {/* ⛔ 상태 수정 불가능 */}
                                    <Td>{r.status}</Td>

                                    <Td>
                                        {isEditing ? (
                                            <input
                                                type="checkbox"
                                                checked={!!editData.rally}
                                                onChange={(e) =>
                                                    handleEditChange("rally", e.target.checked)
                                                }
                                            />
                                        ) : (
                                            <input type="checkbox" checked={r.rally} disabled />
                                        )}
                                    </Td>

                                    <Td>
                                        {isEditing ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={saveEdit}
                                                    className="px-2 py-1 text-xs bg-green-500 text-white rounded border"
                                                >
                                                    저장
                                                </button>
                                                <button
                                                    onClick={() => setEditRowId(null)}
                                                    className="px-2 py-1 text-xs border rounded"
                                                >
                                                    취소
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setEditRowId(r.id);
                                                    setEditData(r);
                                                }}
                                                className="px-2 py-1 text-xs border rounded"
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
    );
}
