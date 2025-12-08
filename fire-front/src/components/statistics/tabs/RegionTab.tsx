// src/components/statistics/tabs/RegionTab.tsx
import React, { useMemo } from "react";
import type { Vehicle } from "../../../types/global";
import { DUMMY_LOGS as LOGS } from "../../../data/logs";
import { avg, groupBy, sum } from "../../../services/statistics/stats";
import { KPI, StatsTable } from "../common";

type Props = {
    vehicles: Vehicle[];
};

const RegionTab: React.FC<Props> = ({ vehicles }) => {
    const grouped = useMemo(
        () =>
            groupBy(LOGS, (l) => {
                const v = vehicles.find((v) => v.id === String(l.vehicleId));
                return v?.sido || "미상";
            }),
        [vehicles]
    );

    const rows = Object.entries(grouped).map(([sido, logs]) => ({
        sido,
        cnt: logs.length,
        vehicles: new Set(logs.map((l) => String(l.vehicleId))).size,
        minutes: sum(logs.map((l) => l.minutes)),
    }));

    return (
        <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KPI title="시도 수" value={rows.length} />
                <KPI title="총 출동 건수" value={sum(rows.map((r) => r.cnt))} />
                <KPI
                    title="평균 활동시간(분/시도)"
                    value={avg(rows.map((r) => r.minutes))}
                />
            </div>

            <div className="mt-3">
                <StatsTable
                    columns={[
                        { key: "sido", header: "시도", align: "left" },
                        {
                            key: "cnt",
                            header: "출동 건수",
                            width: "120px",
                            align: "right",
                        },
                        {
                            key: "vehicles",
                            header: "참여 차량수",
                            width: "120px",
                            align: "right",
                        },
                        {
                            key: "minutes",
                            header: "총 활동시간(분)",
                            width: "160px",
                            align: "right",
                        },
                    ]}
                    rows={rows
                        .sort((a, b) => b.minutes - a.minutes)
                        .map((r) => ({
                            sido: r.sido,
                            cnt: r.cnt.toLocaleString(),
                            vehicles: r.vehicles.toLocaleString(),
                            minutes: r.minutes.toLocaleString(),
                        }))}
                />
            </div>
        </>
    );
};

export default RegionTab;
