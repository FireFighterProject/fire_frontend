import React from "react";
import type{ Vehicle } from "../../types/global";

interface Props {
    vehicles: Vehicle[];
}

const ActivitySummary: React.FC<Props> = ({ vehicles }) => {
    // 지역별 집계
    const counts = vehicles.reduce<Record<string, number>>((acc, v) => {
        acc[v.sido] = (acc[v.sido] || 0) + 1;
        return acc;
    }, {});

    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 10 }}>
                {Object.entries(counts).map(([sido, count]) => (
                    <div
                        key={sido}
                        style={{ border: "1px solid #ddd", padding: "6px 10px" }}
                    >
                        {sido}: {count}대
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActivitySummary;
