// src/components/statistics/tabs/DateTab.tsx
import React, { useMemo, useState } from "react";
import { DUMMY_LOGS as LOGS } from "../../../data/logs";
import { sum } from "../../../services/statistics/stats";
import { KPI, MiniBar, StatsTable } from "../common";

const DateTab: React.FC = () => {
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");

    const list = useMemo(() => {
        const f = from ? new Date(from) : null;
        const t = to ? new Date(to) : null;
        return LOGS.filter((l) => {
            const d = new Date(l.date);
            if (f && d < f) return false;
            if (t && d > t) return false;
            return true;
        }).sort((a, b) => (a.date < b.date ? 1 : -1));
    }, [from, to]);

    return (
        <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <KPI title="기간내 로그" value={list.length} />
                <KPI title="출동건수" value={list.length} />
                <KPI title="복귀건수" value={list.length} />
                <KPI
                    title="총 활동시간(분)"
                    value={sum(list.map((l) => l.minutes))}
                />
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-4">
                <label className="flex flex-col">
                    <span className="mb-1 text-xs text-gray-600">시작</span>
                    <input
                        className="h-9 rounded-lg border border-gray-300 px-2"
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                    />
                </label>
                <label className="flex flex-col">
                    <span className="mb-1 text-xs text-gray-600">끝</span>
                    <input
                        className="h-9 rounded-lg border border-gray-300 px-2"
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                    />
                </label>
            </div>

            <div className="mt-3">
                <StatsTable
                    columns={[
                        { key: "date", header: "날짜", width: "120px" },
                        { key: "dispatch", header: "출동" },
                        { key: "return", header: "복귀" },
                        { key: "moved", header: "장소이동", width: "100px" },
                        {
                            key: "mins",
                            header: "총 활동시간(분)",
                            width: "160px",
                            align: "right",
                        },
                        { key: "bar", header: "차트" },
                    ]}
                    rows={list.map((l) => ({
                        date: l.date,
                        dispatch: l.dispatchTime,
                        return: l.returnTime,
                        moved: l.moved ? "Y" : "-",
                        mins: l.minutes.toLocaleString(),
                        bar: <MiniBar value={l.minutes} max={160} legend="출/복" />,
                    }))}
                />
            </div>
        </>
    );
};

export default DateTab;
