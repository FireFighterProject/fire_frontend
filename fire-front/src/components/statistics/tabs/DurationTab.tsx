// src/components/statistics/tabs/DurationTab.tsx
import React, { useMemo } from "react";
import type { Vehicle } from "../../../types/global";
import { DUMMY_LOGS as LOGS } from "../../../data/logs";
import { avg, sum } from "../../../services/statistics/stats";
import { KPI, MiniBar, StatsTable } from "../common";

type Props = {
    vehicles: Vehicle[];
};

const DurationTab: React.FC<Props> = ({ vehicles }) => {
    const sorted = useMemo(
        () => [...LOGS].sort((a, b) => b.minutes - a.minutes),
        []
    );
    const max = Math.max(...sorted.map((l) => l.minutes), 1);

    return (
        <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KPI title="총 활동시간(분)" value={sum(LOGS.map((l) => l.minutes))} />
                <KPI title="평균(분/대)" value={avg(LOGS.map((l) => l.minutes))} />
                <KPI title="최대(분/대)" value={max} />
            </div>

            <div className="mt-3">
                <StatsTable
                    columns={[
                        { key: "no", header: "연번", width: "70px" },
                        { key: "command", header: "호출명/명령", align: "left" },
                        { key: "type", header: "차종", width: "120px" },
                        { key: "sido", header: "시도", width: "100px" },
                        {
                            key: "minutes",
                            header: "총 활동시간(분)",
                            width: "160px",
                            align: "right",
                        },
                        { key: "bar", header: "미니차트" },
                    ]}
                    rows={sorted.map((l, i) => {
                        const v = vehicles.find((x) => x.id === String(l.vehicleId));
                        return {
                            no: i + 1,
                            command: v
                                ? `${v.callname} / ${l.command}`
                                : `(미상) / ${l.command}`,
                            type: v?.type ?? "미상",
                            sido: v?.sido ?? "미상",
                            minutes: l.minutes.toLocaleString(),
                            bar: <MiniBar value={l.minutes} max={max} />,
                        };
                    })}
                />
            </div>
        </>
    );
};

export default DurationTab;
