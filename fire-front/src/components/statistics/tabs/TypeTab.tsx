// src/components/statistics/tabs/TypeTab.tsx
import React, { useMemo } from "react";
import type { Vehicle } from "../../../types/global";
import { DUMMY_LOGS as LOGS } from "../../../data/logs";
import { avg, groupBy, sum } from "../../../services/statistics/stats";
import { KPI, StatsTable } from "../common";

type Props = {
    vehicles: Vehicle[];
};

const TypeTab: React.FC<Props> = ({ vehicles }) => {
    const grouped = useMemo(
        () =>
            groupBy(LOGS, (l) => {
                const v = vehicles.find((v) => v.id === String(l.vehicleId));
                return v?.type || "미상";
            }),
        [vehicles]
    );

    const rows = Object.entries(grouped).map(([type, logs]) => ({
        type,
        cnt: logs.length,
        crew: sum(logs.map((l) => l.crewCount)),
        minutes: sum(logs.map((l) => l.minutes)),
    }));

    return (
        <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KPI title="차종 수" value={rows.length} />
                <KPI title="총 출동 건수" value={sum(rows.map((r) => r.cnt))} />
                <KPI
                    title="평균 활동시간(분/차종)"
                    value={avg(rows.map((r) => r.minutes))}
                />
            </div>

            <div className="mt-3">
                <StatsTable
                    columns={[
                        { key: "type", header: "차종", align: "left" },
                        {
                            key: "cnt",
                            header: "출동 건수",
                            width: "120px",
                            align: "right",
                        },
                        {
                            key: "crew",
                            header: "참여 인원수",
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
                    rows={rows.map((r) => ({
                        type: r.type,
                        cnt: r.cnt.toLocaleString(),
                        crew: r.crew.toLocaleString(),
                        minutes: r.minutes.toLocaleString(),
                    }))}
                />
            </div>
        </>
    );
};

export default TypeTab;
