// src/pages/Statistics.tsx
import { useCallback, useEffect, useState } from "react";
import type { Vehicle } from "../types/global";
import type { StatLog } from "../types/stats";
import type { ApiStats } from "../api/types";
import { SideMenu, KPI } from "../components/statistics/common";
import GeneralTab from "../components/statistics/tabs/GeneralTab";
import DateTab from "../components/statistics/tabs/DateTab";
import RegionTab from "../components/statistics/tabs/RegionTab";
import TypeTab from "../components/statistics/tabs/TypeTab";
import DurationTab from "../components/statistics/tabs/DurationTab";
import { fetchVehicleList } from "../api/vehicles";
import { fetchFireStationNameMap } from "../api/stations";
import { fetchStatsSummary } from "../api/stats";
import { fetchStatLogs } from "../api/logs";
import { mapApiListToVehicles } from "../services/mappers/vehicleMapper";

type TabKey = "general" | "byDate" | "byRegion" | "byType" | "byDuration";

const MENU: { key: TabKey; label: string }[] = [
  { key: "general", label: "일반" },
  { key: "byDate", label: "일시별" },
  { key: "byRegion", label: "시도별" },
  { key: "byType", label: "차종별" },
  { key: "byDuration", label: "활동 시간별" },
];

export default function StatisticsPage() {
  const [menuOpen, setMenuOpen] = useState<boolean>(true);
  const [tab, setTab] = useState<TabKey>("general");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<StatLog[]>([]);
  const [summary, setSummary] = useState<ApiStats | null>(null);

  const [fetching, setFetching] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setFetching(true);

      const [vehicleList, stationMap, stats, statLogs] = await Promise.all([
        fetchVehicleList(),
        fetchFireStationNameMap(),
        fetchStatsSummary(),
        fetchStatLogs(),
      ]);

      setVehicles(mapApiListToVehicles(vehicleList, stationMap));
      setLogs(statLogs);
      setSummary(stats);
    } catch (e) {
      console.error(e);
      alert("차량/소방서/통계/로그 정보를 불러오지 못했습니다.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 items-center gap-2 border-b border-gray-200 bg-white px-3">
        <button
          className="h-8 w-8 rounded-lg border border-gray-300 hover:bg-gray-50"
          onClick={() => setMenuOpen((v) => !v)}
        >
          ≡
        </button>
        <div className="font-semibold">통계</div>
        <div className="ml-auto">
          <button
            className="h-8 rounded-lg bg-gray-700 px-3 text-white disabled:opacity-60"
            onClick={fetchAll}
            disabled={fetching}
            title="서버에서 최신 통계/차량/소방서/로그 정보 재조회"
          >
            {fetching ? "불러오는 중..." : "새로고침"}
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KPI
            title="등록 차량 수"
            value={summary?.totalVehicles ?? vehicles.length.toLocaleString()}
          />
          <KPI
            title="총 출동 건수"
            value={summary?.totalDispatchCount ?? logs.length}
          />
          <KPI
            title="총 활동 시간(분)"
            value={summary?.totalMinutes ?? 0}
          />
        </div>
      </div>

      <div className="relative grid flex-1 grid-cols-[240px_1fr] overflow-hidden">
        <SideMenu
          open={menuOpen}
          items={MENU}
          active={tab}
          onSelect={(key) => setTab(key as TabKey)}
        />

        <main className="overflow-auto p-4">
          {tab === "general" && <GeneralTab vehicles={vehicles} logs={logs} />}
          {tab === "byDate" && <DateTab logs={logs} />}
          {tab === "byRegion" && <RegionTab vehicles={vehicles} logs={logs} />}
          {tab === "byType" && <TypeTab vehicles={vehicles} logs={logs} />}
          {tab === "byDuration" && <DurationTab vehicles={vehicles} logs={logs} />}
        </main>
      </div>
    </div>
  );
}
