import { RotateCcw, X } from "lucide-react";

type VehicleSummary = {
    id: string;
    callname: string;
    status: string;
    rally?: boolean;
};

type Props = {
    open: boolean;
    vehicles: VehicleSummary[];
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function StandbyResetDialog({
    open,
    vehicles,
    loading = false,
    onConfirm,
    onCancel,
}: Props) {
    if (!open) return null;

    const count = vehicles.length;
    const rallyDoneCount = vehicles.filter((v) => v.rally).length;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="standby-reset-title"
        >
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
                <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <RotateCcw className="h-5 w-5" />
                        </span>
                        <div>
                            <h4
                                id="standby-reset-title"
                                className="text-base font-semibold text-gray-900"
                            >
                                대기 상태로 전환
                            </h4>
                            <p className="mt-1 text-sm text-gray-600">
                                {count === 1
                                    ? "아래 차량을 대기 상태로 변경합니다."
                                    : `선택한 ${count}대를 대기 상태로 변경합니다.`}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                        aria-label="닫기"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="max-h-52 overflow-y-auto px-5 py-4">
                    <ul className="space-y-2">
                        {vehicles.map((v) => (
                            <li
                                key={v.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                            >
                                <span className="font-medium text-gray-900 truncate">
                                    {v.callname}
                                </span>
                                <span className="shrink-0 text-xs text-gray-500">
                                    현재 {v.status}
                                    {v.rally ? " · 집결완료" : ""}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {rallyDoneCount > 0 && (
                    <p className="border-t border-gray-100 px-5 py-3 text-xs leading-relaxed text-gray-500">
                        집결이 완료된 차량 {rallyDoneCount}대가 포함되어 있습니다.
                        출동 편성에 다시 사용할 수 있도록 대기로 되돌립니다.
                    </p>
                )}

                <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                        <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        {loading ? "변경 중..." : "대기로 전환"}
                    </button>
                </div>
            </div>
        </div>
    );
}
