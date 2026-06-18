/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useMemo } from "react";
import Td from "./Td";
import type { Vehicle } from "../../../types/vehicle";
import { formatPhone, normalizePhone } from "../../../services/Register/utils";
import { statusCodeToLabel } from "../../../services/mappers/vehicleMapper";
import { statusLabelToCode } from "../../../services/vehicle/status";

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

    gpsActiveIds: number[];

    selectedIds: Set<string>;
    toggleSelect: (id: string) => void;
    toggleSelectAll: (checked: boolean) => void;
    onDeleteSelected: () => void;
    deleting: boolean;
};

function VehicleTable({
    rows,
    allStations,
    loading,
    editRowId,
    editData,
    setEditData,
    setEditRowId,
    saveEdit,
    gpsActiveIds,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    onDeleteSelected,
    deleting,
}: Props) {
    const mappedRows = useMemo(() => {
        return rows.map((r) => {
            const found = allStations.find(
                (s) => Number(s.id) === Number(r.stationId)
            );
            return { ...r, station: found?.name ?? r.station };
        });
    }, [rows, allStations]);

    const gpsActiveSet = useMemo(
        () => new Set(gpsActiveIds.map((id) => Number(id))),
        [gpsActiveIds]
    );

    const headers = [
        "선택",
        "연번",
        "소방서",
        "호출명",
        "차종",
        "인원",
        "연락처",
        "상태",
        "집결",
        "수정",
    ];

    const allSelected = mappedRows.length > 0 && mappedRows.every((r) => selectedIds.has(String(r.id)));
    const someSelected = mappedRows.some((r) => selectedIds.has(String(r.id)));

    const statusLabel = (raw: string) => statusCodeToLabel(statusLabelToCode(raw));

    const isReturningStatus = (raw: string) =>
        raw === "복귀중" || raw === "철수" || raw === "복귀";

    const change = (field: keyof Vehicle, value: any) =>
        setEditData((prev) => ({ ...prev, [field]: value }));

    const handlePhoneChange = (raw: string) => {
        change("contact", normalizePhone(raw));
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                <button
                    onClick={onDeleteSelected}
                    disabled={selectedIds.size === 0 || deleting}
                    className={`px-4 py-2 text-sm rounded text-white ${
                        selectedIds.size === 0 || deleting
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-red-500 hover:bg-red-600"
                    }`}
                >
                    {deleting ? "삭제 중..." : `선택 삭제 (${selectedIds.size})`}
                </button>
                {someSelected && (
                    <span className="text-sm text-gray-500">
                        {selectedIds.size}개 선택됨
                    </span>
                )}
            </div>

            <div className="overflow-auto border border-gray-300 rounded bg-white">
                <table className="min-w-[900px] w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                        <tr>
                            {headers.map((h, idx) => (
                                <th
                                    key={h}
                                    className="border border-gray-300 px-3 py-2 font-semibold text-center whitespace-nowrap"
                                >
                                    {idx === 0 ? (
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={(e) => toggleSelectAll(e.target.checked)}
                                            className="w-4 h-4"
                                        />
                                    ) : (
                                        h
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>

                <tbody>
                    {mappedRows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={headers.length}
                                className="border border-gray-300 text-center py-10"
                            >
                                {loading ? "불러오는 중..." : "등록된 차량이 없습니다."}
                            </td>
                        </tr>
                    ) : (
                        mappedRows.map((r, idx) => {
                            const editing = r.id === editRowId;
                            const hasGps = gpsActiveSet.has(Number(r.id));

                            const rowClass = hasGps
                                ? isReturningStatus(String(r.status))
                                    ? "bg-amber-100/50"
                                    : "bg-red-100/40"
                                : isReturningStatus(String(r.status))
                                    ? "bg-amber-50"
                                    : idx % 2 === 1
                                        ? "bg-gray-50/40"
                                        : "";

                            return (
                                <tr key={r.id} className={rowClass}>
                                    <Td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(String(r.id))}
                                            onChange={() => toggleSelect(String(r.id))}
                                            className="w-4 h-4"
                                        />
                                    </Td>

                                    <Td>{idx + 1}</Td>

                                    <Td>{r.station}</Td>

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

                                    <Td>
                                        {editing ? (
                                            <input
                                                value={formatPhone(editData.contact ?? r.contact ?? "")}
                                                onChange={(e) =>
                                                    handlePhoneChange(e.target.value)
                                                }
                                                className="border px-2 py-1 w-full rounded"
                                                placeholder="010-0000-0000"
                                            />
                                        ) : (
                                            formatPhone(r.contact ?? "")
                                        )}
                                    </Td>

                                    <Td>
                                        <span
                                            className={
                                                "inline-block px-2 py-0.5 rounded text-xs font-semibold " +
                                                (isReturningStatus(String(r.status))
                                                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                                                    : r.status === "활동" || r.status === "출동중"
                                                      ? "bg-red-100 text-red-800 border border-red-300"
                                                      : r.status === "집결중"
                                                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                                                        : "bg-green-100 text-green-800 border border-green-300")
                                            }
                                        >
                                            {statusLabel(String(r.status))}
                                        </span>
                                    </Td>

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
        </div>
    );
}

export default memo(VehicleTable);
