/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useMemo } from "react";
import { Info, RotateCcw, Trash2 } from "lucide-react";
import Td from "./Td";
import type { Vehicle } from "../../../types/vehicle";
import { formatPhone, normalizePhone } from "../../../services/Register/utils";
import { statusCodeToLabel } from "../../../services/mappers/vehicleMapper";
import { canResetToStandby, statusLabelToCode } from "../../../services/vehicle/status";

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
    onResetToStandby: (id: string) => void;
    onResetSelectedToStandby: () => void;
    resettableSelectedCount: number;
    resettableInViewCount: number;
    resetting: boolean;
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
    onResetToStandby,
    onResetSelectedToStandby,
    resettableSelectedCount,
    resettableInViewCount,
    resetting,
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
        "작업",
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

    const inlineInputClass =
        "w-full min-w-0 bg-transparent px-0 py-0.5 text-sm text-center text-gray-900 " +
        "border-0 border-b border-gray-300 outline-none focus:border-blue-400 focus:bg-blue-50/40";

    const actionBtnClass =
        "w-full whitespace-nowrap rounded border px-2 py-1 text-xs leading-none";

    return (
        <div className="space-y-3">
            {resettableInViewCount > 0 && (
                <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="space-y-1">
                        <p className="font-medium">
                            대기로 되돌릴 수 있는 차량이 {resettableInViewCount}대 있습니다.
                        </p>
                        <p className="text-xs leading-relaxed text-emerald-800/90">
                            집결 완료 후에도 활동·집결중 등으로 남아 있는 차량은
                            「대기로 변경」으로 출동 편성에 다시 사용할 수 있게 됩니다.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-sm text-gray-600">
                    {someSelected ? (
                        <span>
                            <strong className="text-gray-900">{selectedIds.size}대</strong> 선택됨
                            {resettableSelectedCount > 0 && (
                                <span className="text-emerald-700">
                                    {" "}
                                    · 대기 전환 가능 {resettableSelectedCount}대
                                </span>
                            )}
                        </span>
                    ) : (
                        <span>차량을 선택하거나 각 행에서 바로 변경할 수 있습니다.</span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={onResetSelectedToStandby}
                        disabled={resettableSelectedCount === 0 || resetting}
                        title={
                            resettableSelectedCount === 0
                                ? "선택한 차량 중 대기로 바꿀 수 있는 차량이 없습니다"
                                : "선택한 차량을 대기 상태로 변경"
                        }
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                            resettableSelectedCount === 0 || resetting
                                ? "cursor-not-allowed border border-gray-200 bg-white text-gray-400"
                                : "border border-emerald-200 bg-white text-emerald-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50"
                        }`}
                    >
                        <RotateCcw
                            className={`h-4 w-4 ${resetting ? "animate-spin" : ""}`}
                        />
                        {resetting
                            ? "변경 중..."
                            : resettableSelectedCount > 0
                              ? `선택 차량 대기로 변경 (${resettableSelectedCount})`
                              : "선택 차량 대기로 변경"}
                    </button>

                    <button
                        type="button"
                        onClick={onDeleteSelected}
                        disabled={selectedIds.size === 0 || deleting}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                            selectedIds.size === 0 || deleting
                                ? "cursor-not-allowed bg-gray-300"
                                : "bg-red-500 hover:bg-red-600"
                        }`}
                    >
                        <Trash2 className="h-4 w-4" />
                        {deleting ? "삭제 중..." : `선택 삭제 (${selectedIds.size})`}
                    </button>
                </div>
            </div>

            <div className="overflow-auto border border-gray-300 rounded bg-white">
                <table className="min-w-[900px] w-full table-fixed text-sm border-collapse">
                    <colgroup>
                        <col className="w-10" />
                        <col className="w-12" />
                        <col className="w-28" />
                        <col className="w-28" />
                        <col className="w-24" />
                        <col className="w-14" />
                        <col className="w-32" />
                        <col className="w-20" />
                        <col className="w-12" />
                        <col className="w-28" />
                    </colgroup>
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
                            const editing = String(r.id) === String(editRowId);
                            const hasGps = gpsActiveSet.has(Number(r.id));
                            const showStandbyAction =
                                !editing && canResetToStandby(String(r.status));

                            const rowClass = [
                                hasGps
                                    ? isReturningStatus(String(r.status))
                                        ? "bg-amber-100/50"
                                        : "bg-red-100/40"
                                    : isReturningStatus(String(r.status))
                                      ? "bg-amber-50"
                                      : idx % 2 === 1
                                        ? "bg-gray-50/40"
                                        : "",
                                editing ? "ring-1 ring-inset ring-blue-200" : "",
                            ]
                                .filter(Boolean)
                                .join(" ");

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
                                                className={inlineInputClass}
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
                                                className={inlineInputClass}
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
                                                className={inlineInputClass}
                                            />
                                        ) : (
                                            r.personnel
                                        )}
                                    </Td>

                                    <Td>
                                        {editing ? (
                                            <input
                                                value={formatPhone(
                                                    editData.contact ?? r.contact ?? ""
                                                )}
                                                onChange={(e) =>
                                                    handlePhoneChange(e.target.value)
                                                }
                                                className={inlineInputClass}
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
                                        <input
                                            type="checkbox"
                                            checked={
                                                editing
                                                    ? !!editData.rally
                                                    : !!r.rally
                                            }
                                            disabled={!editing}
                                            onChange={(e) =>
                                                change("rally", e.target.checked)
                                            }
                                            className="h-4 w-4 disabled:opacity-100"
                                        />
                                    </Td>

                                    <Td>
                                        <div className="mx-auto flex w-[108px] flex-col gap-1.5">
                                            {editing ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={saveEdit}
                                                        className={`${actionBtnClass} border-green-500 bg-green-500 text-white hover:bg-green-600`}
                                                    >
                                                        저장
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditRowId(null)}
                                                        className={`${actionBtnClass} border-gray-300 bg-white hover:bg-gray-50`}
                                                    >
                                                        취소
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditRowId(String(r.id));
                                                            setEditData(r);
                                                        }}
                                                        className={`${actionBtnClass} border-gray-300 bg-white hover:bg-gray-50`}
                                                    >
                                                        수정
                                                    </button>
                                                    {showStandbyAction ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onResetToStandby(String(r.id))
                                                            }
                                                            disabled={resetting}
                                                            className={`${actionBtnClass} inline-flex items-center justify-center gap-1 border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50`}
                                                        >
                                                            <RotateCcw className="h-3 w-3 shrink-0" />
                                                            <span className="shrink-0">대기로 변경</span>
                                                        </button>
                                                    ) : (
                                                        <span
                                                            className={`${actionBtnClass} invisible pointer-events-none border-transparent`}
                                                            aria-hidden
                                                        >
                                                            대기로 변경
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
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
