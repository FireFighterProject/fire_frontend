/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import Td from "./Td";
import type { Vehicle } from "../../../types/vehicle";

type StationInfo = { id: number; name: string; sido: string };

type Props = {
    rows: Vehicle[];
    allStations: StationInfo[];
    loading: boolean;
    editRowId: string | number | null;
    editData: Partial<Vehicle>;
    setEditData: React.Dispatch<React.SetStateAction<Partial<Vehicle>>>;
    setEditRowId: React.Dispatch<React.SetStateAction<string | null>>;

    saveEdit: () => void;

    // ✅ GPS가 한 번이라도 등록된 차량 id 목록
    gpsActiveIds: number[];
};

export default function VehicleTable({
    rows,
    allStations,
    loading,
    editRowId,
    editData,
    setEditData,
    setEditRowId,
    saveEdit,
    gpsActiveIds,
}: Props) {
    const mappedRows = useMemo(() => {
        return rows.map((r) => {
            const found = allStations.find(
                (s) => Number(s.id) === Number(r.stationId)
            );
            return { ...r, station: found?.name ?? r.station };
        });
    }, [rows, allStations]);

    // ✅ 빠른 포함 체크용 Set
    const gpsActiveSet = useMemo(
        () => new Set(gpsActiveIds.map((id) => Number(id))),
        [gpsActiveIds]
    );

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

    const change = (field: keyof Vehicle, value: any) =>
        setEditData((prev) => ({ ...prev, [field]: value }));

    return (
        <div className="overflow-auto border rounded bg-white">
            <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        {headers.map((h) => (
                            <th key={h} className="px-3 py-2 font-semibold">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {mappedRows.length === 0 ? (
                        <tr>
                            <td colSpan={headers.length} className="text-center py-10">
                                {loading ? "불러오는 중..." : "등록된 차량이 없습니다."}
                            </td>
                        </tr>
                    ) : (
                        mappedRows.map((r, idx) => {
                            const editing = r.id === editRowId;
                            const hasGps = gpsActiveSet.has(Number(r.id));

                            //  GPS 있으면 연두색, 없으면 짝수줄만 회색
                            const rowClass = hasGps
                                ? "bg-red-100/40"
                                : idx % 2 === 1
                                    ? "bg-gray-50/40"
                                    : "";

                            return (
                                <tr key={r.id} className={rowClass}>
                                    <Td>{idx + 1}</Td>

                                    {/* 시도 */}
                                    <Td>
                                        {editing ? (
                                            <input
                                                value={editData.sido ?? r.sido}
                                                onChange={(e) =>
                                                    change("sido", e.target.value)
                                                }
                                                className="border px-2 py-1 w-full rounded"
                                            />
                                        ) : (
                                            r.sido
                                        )}
                                    </Td>

                                    {/* 소방서 */}
                                    <Td>{r.station}</Td>

                                    {/* 차종 */}
                                    <Td>
                                        {editing ? (
                                            <input
                                                value={editData.type ?? r.type}
                                                onChange={(e) =>
                                                    change("type", e.target.value)
                                                }
                                                className="border px-2 py-1 w-full rounded"
                                            />
                                        ) : (
                                            r.type
                                        )}
                                    </Td>

                                    {/* 호출명 */}
                                    <Td>
                                        {editing ? (
                                            <input
                                                value={editData.callname ?? r.callname}
                                                onChange={(e) =>
                                                    change("callname", e.target.value)
                                                }
                                                className="border px-2 py-1 w-full rounded"
                                            />
                                        ) : (
                                            r.callname
                                        )}
                                    </Td>

                                    {/* 용량 */}
                                    <Td>
                                        {editing ? (
                                            <input
                                                value={editData.capacity ?? r.capacity}
                                                onChange={(e) =>
                                                    change("capacity", e.target.value)
                                                }
                                                className="border px-2 py-1 w-full rounded"
                                            />
                                        ) : (
                                            r.capacity
                                        )}
                                    </Td>

                                    {/* 인원 */}
                                    <Td>
                                        {editing ? (
                                            <input
                                                value={editData.personnel ?? r.personnel}
                                                onChange={(e) =>
                                                    change("personnel", e.target.value)
                                                }
                                                className="border px-2 py-1 w-full rounded"
                                            />
                                        ) : (
                                            r.personnel
                                        )}
                                    </Td>

                                    {/* AVL */}
                                    <Td>
                                        {editing ? (
                                            <input
                                                value={editData.avl ?? r.avl}
                                                onChange={(e) =>
                                                    change("avl", e.target.value)
                                                }
                                                className="border px-2 py-1 w-full rounded"
                                            />
                                        ) : (
                                            r.avl
                                        )}
                                    </Td>

                                    {/* PS-LTE */}
                                    <Td>{r.pslte}</Td>

                                    {/* 상태 */}
                                    <Td>{r.status}</Td>

                                    {/* 집결 */}
                                    <Td>
                                        {editing ? (
                                            <input
                                                type="checkbox"
                                                checked={!!editData.rally}
                                                onChange={(e) =>
                                                    change("rally", e.target.checked)
                                                }
                                            />
                                        ) : (
                                            <input type="checkbox" checked={!!r.rally} disabled />
                                        )}
                                    </Td>

                                    {/* 수정/저장 */}
                                    <Td>
                                        {editing ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={saveEdit}
                                                    className="px-2 py-1 text-xs bg-green-500 text-white rounded"
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
                                                    setEditRowId(String(r.id));
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
