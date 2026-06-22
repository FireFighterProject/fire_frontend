import { MapPin } from "lucide-react";
import type { RefObject } from "react";

type Props = {
    mapWrapperRef: RefObject<HTMLDivElement | null>;
    mapContainerRef: RefObject<HTMLDivElement | null>;
    mapReady: boolean;
    locationName: string;
    // radarOn: boolean;
    // onToggleRadar: () => void;
    // radarStatus: "idle" | "loading" | "ready" | "error";
    // radarError: string;
};

export default function ForecastMapPanel({
    mapWrapperRef,
    mapContainerRef,
    mapReady,
    locationName,
    // radarOn,
    // onToggleRadar,
    // radarStatus,
    // radarError,
}: Props) {
    return (
        <div className="relative h-full p-3 lg:p-4 lg:pr-2">
            <div
                ref={mapWrapperRef}
                className="forecast-map-shell relative h-full min-h-[360px] overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] lg:min-h-[540px] isolate"
            >
                {!mapReady && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-100 text-sm text-gray-500">
                        지도 로딩 중...
                    </div>
                )}

                <div
                    ref={mapContainerRef}
                    className="forecast-map-pane absolute inset-0 z-[1] touch-none"
                    style={{ cursor: "grab" }}
                />

                {/* 가장자리 비네팅 */}
                <div className="pointer-events-none absolute inset-0 z-[2] rounded-2xl shadow-[inset_0_0_40px_rgba(15,23,42,0.08)]" />

                {/* 중심 조준점 */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-[4] -translate-x-1/2 -translate-y-1/2">
                    <div className="relative flex h-20 w-20 items-center justify-center">
                        <span className="absolute h-20 w-20 rounded-full border-2 border-red-400/35 bg-red-500/5" />
                        <span className="absolute h-10 w-10 rounded-full border border-red-500/50" />
                        <span className="absolute h-px w-24 bg-red-500/25" />
                        <span className="absolute h-24 w-px bg-red-500/25" />
                        <MapPin className="relative -mt-5 h-9 w-9 fill-red-500 text-red-500 drop-shadow-lg" />
                    </div>
                </div>

                {/* 상단: 위치 카드 */}
                <div className="absolute left-3 top-3 z-[5] max-w-[min(100%,280px)]">
                    <div className="rounded-xl border border-white/70 bg-white/90 px-3 py-2.5 shadow-lg backdrop-blur-md">
                        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            <MapPin className="h-3.5 w-3.5 text-red-500" />
                            조회 위치
                        </div>
                        <p className="truncate text-sm font-bold text-slate-800" title={locationName}>
                            {locationName}
                        </p>
                    </div>
                </div>

                {/* 하단: 컨트롤 도크 */}
                <div className="absolute bottom-3 left-3 right-14 z-[5] flex items-end justify-between gap-3">
                    <div className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-[11px] text-slate-600 shadow-md backdrop-blur-md">
                        <p className="font-medium text-slate-700">지도 조작</p>
                        <p className="mt-0.5">드래그 이동 · 휠 확대/축소</p>
                    </div>

                    {/* 강수 레이더 (백엔드 API 연동 전까지 비활성)
                    <div className="flex flex-col items-end gap-2">
                        <button
                            type="button"
                            onClick={onToggleRadar}
                            aria-pressed={radarOn}
                            className={
                                "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold shadow-lg transition active:scale-[0.98] " +
                                (radarOn
                                    ? "border-sky-600 bg-sky-600 text-white hover:bg-sky-700"
                                    : "border-slate-200 bg-white/95 text-slate-800 hover:bg-white")
                            }
                        >
                            <Radio className={`h-4 w-4 ${radarOn ? "animate-pulse" : ""}`} />
                            {radarOn ? "강수 레이더 ON" : "강수 레이더"}
                        </button>

                        {radarOn && (
                            <div className="rounded-xl border border-slate-200/80 bg-white/92 px-3 py-2 shadow-md backdrop-blur-md">
                                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                                    <Layers className="h-3.5 w-3.5" />
                                    강수 강도
                                </div>
                                <div className="flex h-2 w-36 overflow-hidden rounded-full">
                                    <span className="flex-1 bg-sky-200" title="약함" />
                                    <span className="flex-1 bg-sky-400" title="보통" />
                                    <span className="flex-1 bg-emerald-400" title="강함" />
                                    <span className="flex-1 bg-yellow-400" title="매우 강함" />
                                    <span className="flex-1 bg-orange-500" title="호우" />
                                    <span className="flex-1 bg-red-600" title="극심" />
                                </div>
                                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                                    <span>약</span>
                                    <span>강</span>
                                </div>
                            </div>
                        )}

                        {radarOn && radarStatus === "loading" && (
                            <span className="rounded-lg bg-slate-900/80 px-2.5 py-1 text-xs text-white">
                                레이더 갱신 중...
                            </span>
                        )}

                        {radarOn && radarStatus === "error" && (
                            <span className="max-w-[220px] rounded-lg bg-red-600/90 px-2.5 py-1 text-right text-xs text-white">
                                {radarError}
                            </span>
                        )}
                    </div>
                    */}
                </div>
            </div>
        </div>
    );
}
