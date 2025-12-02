import React from "react";
import type { MapStats } from "../../types/map";

type Props = {
    top: number;
    stats: MapStats;
    selectedSido: string;
};

const MapStatsPanel: React.FC<Props> = ({ top, stats, selectedSido }) => {
    return (
        <div
            className="fixed left-4 z-40 min-w-[210px] rounded-lg bg-white/95 shadow-lg ring-1 ring-gray-200 p-3 text-[13px] leading-6"
            style={{ top }}
        >
            <div className="font-semibold mb-1.5">지도 차량 통계</div>

            <div className="grid grid-cols-[auto_1fr] gap-x-2.5">

                {/* 시/도 선택 통계 */}
                <div>
                    {selectedSido
                        ? `선택지역(${selectedSido}) 차량수:`
                        : "선택지역 차량수:"}
                </div>
                <div className="text-right">{stats.selectedAreaCount}대</div>

                {/* 드래그 구역 통계 */}
                <div>드래그구역 차량수:</div>
                <div className="text-right">{stats.dragAreaCount}대</div>

                {/* 전체 차량 */}
                <div>전체 차량수:</div>
                <div className="text-right">{stats.totalCount}대</div>
            </div>

            <div className="mt-1.5 text-[11px] text-gray-600 space-x-2">
                <span className="inline-block rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5">
                    지도 클릭 → 시/도 통계
                </span>
                <span className="inline-block rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5">
                    드래그 → 범위 통계
                </span>
            </div>
        </div>
    );
};

export default MapStatsPanel;
