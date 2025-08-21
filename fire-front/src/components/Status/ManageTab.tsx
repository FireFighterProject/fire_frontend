import React, { useMemo, useState } from "react";
import type { Vehicle } from "../../data/vehicles";
import { DUMMY_VEHICLES } from "../../data/vehicles";

function ManageTab() {
    const [rows, setRows] = useState<Vehicle[]>(DUMMY_VEHICLES);
    const [editRowId, setEditRowId] = useState<string | null>(null); // 현재 수정 중인 행 id
    const [editData, setEditData] = useState<Partial<Vehicle>>({}); // 수정용 임시 데이터

    const headers = useMemo(
        () => ["연번", "시도", "소방서", "차종", "호출명", "용량", "인원", "AVL", "PS-LTE", "상태", "자원집결지", "수정"],
        []
    );

    const startEdit = (row: Vehicle) => {
        setEditRowId(row.id);
        setEditData(row); // 현재 행 데이터를 복사
    };

    const cancelEdit = () => {
        setEditRowId(null);
        setEditData({});
    };

    const saveEdit = () => {
        setRows((prev) => prev.map((r) => (r.id === editRowId ? { ...r, ...editData } : r)));
        cancelEdit();
    };

    const handleChange = <K extends keyof Vehicle>(field: K, value: Vehicle[K]) => {
        setEditData((prev) => ({ ...prev, [field]: value }));
    };


    return (
        <div className="p-6 space-y-4">
            <h3 className="font-semibold">등록 차량 리스트</h3>

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
                                    등록된 차량이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            rows.map((r, idx) => {
                                const isEditing = editRowId === r.id;
                                return (
                                    <tr key={r.id} className="even:bg-gray-50/40">
                                        <Td>{idx + 1}</Td>
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    value={editData.sido || ""}
                                                    onChange={(e) => handleChange("sido", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                />
                                            ) : (
                                                r.sido
                                            )}
                                        </Td>
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    value={editData.station || ""}
                                                    onChange={(e) => handleChange("station", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                />
                                            ) : (
                                                r.station
                                            )}
                                        </Td>
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    value={editData.type || ""}
                                                    onChange={(e) => handleChange("type", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                />
                                            ) : (
                                                r.type
                                            )}
                                        </Td>
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    value={editData.callname || ""}
                                                    onChange={(e) => handleChange("callname", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                />
                                            ) : (
                                                r.callname
                                            )}
                                        </Td>
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editData.capacity || ""}
                                                    onChange={(e) => handleChange("capacity", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                />
                                            ) : (
                                                r.capacity
                                            )}
                                        </Td>
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editData.personnel || ""}
                                                    onChange={(e) => handleChange("personnel", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                />
                                            ) : (
                                                r.personnel
                                            )}
                                        </Td>
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    value={editData.avl || ""}
                                                    onChange={(e) => handleChange("avl", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                />
                                            ) : (
                                                r.avl
                                            )}
                                        </Td>
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    value={editData.pslte || ""}
                                                    onChange={(e) => handleChange("pslte", e.target.value)}
                                                    className="border px-2 py-1 rounded w-full"
                                                />
                                            ) : (
                                                r.pslte
                                            )}
                                        </Td>
                                        <Td>
                                            {isEditing ? (
                                                <select
                                                    value={editData.status ?? ""}
                                                    onChange={(e) => handleChange("status", e.target.value as Vehicle["status"])}
                                                >
                                                    <option value="활동">활동</option>
                                                    <option value="대기">대기</option>
                                                    <option value="철수">철수</option>
                                                </select>

                                            ) : (
                                                r.status
                                            )}
                                        </Td>
                                        <Td>
                                            {isEditing ? (
                                                <input
                                                    type="checkbox"
                                                    checked={!!editData.rally}
                                                    onChange={(e) => handleChange("rally", e.target.checked)}
                                                />
                                            ) : (
                                                <input type="checkbox" checked={!!r.rally} disabled />
                                            )}
                                        </Td>
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
