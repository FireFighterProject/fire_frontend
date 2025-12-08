// src/components/statistics/tabs/GeneralTab.tsx
import React, { useMemo, useState } from "react";
import type { Vehicle } from "../../../types/global";
import type { StatLog } from "../../../types/stats.ts";
import { uniq, sum, avg } from "../../../services/statistics/stats";
import { KPI, StatsModal, StatsTable } from "../common";

type Props = {
    vehicles: Vehicle[];
    logs: StatLog[];
};

const GeneralTab: React.FC<Props> = ({ vehicles, logs }) => {
    const [sido, setSido] = useState<string>("");
    const [type, setType] = useState<string>("");
    const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);

    const filtered = useMemo(
        () =>
            vehicles.filter(
                (v) => (!sido || v.sido === sido) && (!type || v.type === type)
            ),
        [vehicles, sido, type]
    );

    const logsForDetail = useMemo(
        () =>
            logs
                .filter((l) => String(l.vehicleId) === (detailVehicle?.id ?? ""))
                .sort((a, b) => (a.dispatchTime < b.dispatchTime ? 1 : -1)),
        [logs, detailVehicle]
    );

    return (
        <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KPI title="등록 차량" value={vehicles.length} />
                <KPI
                    title="총 인원 합계"
                    value={sum(vehicles.map((v) => Number(v.personnel) || 0))}
                />
                <KPI
                    title="평균 활동 시간(분/대)"
                    value={logs.length ? avg(logs.map((l) => l.minutes)) : 0}
                />
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-4">
                <label className="flex flex-col">
                    <span className="mb-1 text-xs text-gray-600">1차 필터 (시/도)</span>
                    <select
                        className="h-9 min-w-[180px] rounded-lg border border-gray-300 px-2"
                        value={sido}
                        onChange={(e) => setSido(e.target.value)}
                    >
                        <option value="">전체</option>
                        {uniq(vehicles.map((v) => v.sido)).map((s) => (
                            <option key={s}>{s}</option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col">
                    <span className="mb-1 text-xs text-gray-600">2차 필터 (차종)</span>
                    <select
                        className="h-9 min-w-[180px] rounded-lg border border-gray-300 px-2"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                    >
                        <option value="">전체</option>
                        {uniq(vehicles.map((v) => v.type)).map((t) => (
                            <option key={t}>{t}</option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="mt-3">
                <StatsTable
                    columns={[
                        { key: "no", header: "연번", width: "64px" },
                        { key: "sido", header: "시도" },
                        { key: "station", header: "소방서" },
                        { key: "type", header: "차종" },
                        { key: "callname", header: "호출명" },
                        { key: "pslte", header: "PS-LTE" },
                        { key: "avl", header: "AVL" },
                    ]}
                    rows={filtered.map((v, i) => ({
                        no: i + 1,
                        sido: v.sido,
                        station: v.station,
                        type: v.type,
                        callname: (
                            <button
                                className="text-blue-600 underline-offset-2 hover:underline"
                                onClick={() => setDetailVehicle(v)}
                                title="활동 이력 보기"
                            >
                                {v.callname}
                            </button>
                        ),
                        pslte: v.pslte ? "O" : "-",
                        avl: v.avl ? "O" : "-",
                    }))}
                />
            </div>

            <StatsModal
                open={!!detailVehicle}
                onClose={() => setDetailVehicle(null)}
                title={detailVehicle ? `차량 이력: ${detailVehicle.callname}` : ""}
            >
                <StatsTable
                    columns={[
                        { key: "date", header: "일자", width: "120px" },
                        { key: "dispatch", header: "출동 일시", width: "140px" },
                        { key: "place", header: "장소" },
                        { key: "return", header: "복귀 일시", width: "140px" },
                        { key: "minutes", header: "소요(분)", width: "90px", align: "right" },
                        { key: "moved", header: "이동", width: "70px" },
                        { key: "cmd", header: "명령", width: "120px" },
                    ]}
                    rows={logsForDetail.map((l) => ({
                        date: l.date,
                        dispatch: l.dispatchTime,
                        place: l.dispatchPlace,
                        return: l.returnTime,
                        minutes: l.minutes.toLocaleString(),
                        moved: l.moved ? "Y" : "-",
                        cmd: l.command,
                    }))}
                    emptyText="활동 이력이 없습니다."
                />
            </StatsModal>
        </>
    );
};

export default GeneralTab;
