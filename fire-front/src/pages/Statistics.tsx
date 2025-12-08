// src/pages/Statistics.tsx
import { useEffect, useState } from "react";
import axios from "axios";

/* 타입 */
import type { Vehicle } from "../types/global";

/* 컴포넌트 */
import { SideMenu } from "../components/statistics/common";
import GeneralTab from "../components/statistics/tabs/GeneralTab";
import DateTab from "../components/statistics/tabs/DateTab";
import RegionTab from "../components/statistics/tabs/RegionTab";
import TypeTab from "../components/statistics/tabs/TypeTab";
import DurationTab from "../components/statistics/tabs/DurationTab";

/* 서버 응답 타입 & 매핑 */
type ApiVehicleListItem = {
  id: number;
  stationId: number;
  sido: string;
  typeName: string;
  callSign: string;
  status: number; // 0=대기, 1=출동중
  rallyPoint: number; // 0/1
  capacity?: number;
  personnel?: number;
  avlNumber?: string;
  psLteNumber?: string;
};

const STATUS_LABELS: Record<number, Vehicle["status"] | string> = {
  0: "대기",
  1: "출동중",
};

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

const mapApiToVehicle = (v: ApiVehicleListItem): Vehicle => {
  const statusLabel = STATUS_LABELS[v.status] ?? String(v.status);
  return {
    id: String(v.id),
    sido: v.sido ?? "",
    station: "",
    type: v.typeName ?? "",
    callname: v.callSign ?? "",
    capacity: Number.isFinite(v.capacity as number)
      ? (v.capacity as number)
      : 0,
    personnel: Number.isFinite(v.personnel as number)
      ? (v.personnel as number)
      : 0,
    avl: v.avlNumber ?? "",
    pslte: v.psLteNumber ?? "",
    status: statusLabel as Vehicle["status"],
    rally: v.rallyPoint === 1,
    dispatchPlace: "",
    lat: undefined,
    lng: undefined,
    contact: "",
    content: "",
  } as Vehicle;
};

/* 탭 타입 */
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
  const [fetching, setFetching] = useState(false);

  const fetchVehicles = async () => {
    try {
      setFetching(true);
      const res = await api.get<ApiVehicleListItem[]>("/vehicles");
      setVehicles((res.data ?? []).map(mapApiToVehicle));
    } catch (e) {
      console.error(e);
      alert("차량 목록을 불러오지 못했습니다.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* 상단 툴바 */}
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
            onClick={fetchVehicles}
            disabled={fetching}
            title="서버에서 최신 차량 목록 재조회"
          >
            {fetching ? "불러오는 중..." : "새로고침"}
          </button>
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
          {tab === "general" && <GeneralTab vehicles={vehicles} />}
          {tab === "byDate" && <DateTab />}
          {tab === "byRegion" && <RegionTab vehicles={vehicles} />}
          {tab === "byType" && <TypeTab vehicles={vehicles} />}
          {tab === "byDuration" && <DurationTab vehicles={vehicles} />}
        </main>
      </div>
    </div>
  );
}
