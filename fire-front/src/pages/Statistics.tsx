/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/Statistics.tsx
import  { useEffect, useState } from "react";
import axios from "axios";

/* ========= 타입 ========= */
import type { Vehicle } from "../types/global";

/* ========= 공통 컴포넌트 & 탭 ========= */
import { SideMenu, KPI } from "../components/statistics/common";
import GeneralTab from "../components/statistics/tabs/GeneralTab";
import DateTab from "../components/statistics/tabs/DateTab";
import RegionTab from "../components/statistics/tabs/RegionTab";
import TypeTab from "../components/statistics/tabs/TypeTab";
import DurationTab from "../components/statistics/tabs/DurationTab";

/* ========= 서버 응답 타입 ========= */
type ApiVehicleListItem = {
  id: number;
  stationId: number;
  sido: string;
  typeName: string;
  callSign: string;
  status: number; // 0=대기, 1=출동중 (백엔드 정의)
  rallyPoint: number; // 0/1
  capacity?: number;
  personnel?: number;
  avlNumber?: string;
  psLteNumber?: string;
};

type ApiFireStation = {
  id: number;
  sido: string;
  name: string;
  address: string;
};

// /api/stats 응답은 아직 정확한 스키마를 정하지 않았으니 any로 받아서 유연하게 사용
type ApiStats = any;

/* ========= 상태 라벨 ========= */
const STATUS_LABELS: Record<number, Vehicle["status"] | string> = {
  0: "대기",
  1: "출동중",
};

/* ========= axios 인스턴스 ========= */
const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

/* ========= 서버 → Vehicle 매핑 (소방서 이름 매핑 포함) ========= */
const mapApiToVehicle = (
  v: ApiVehicleListItem,
  stationMap?: Map<number, string>
): Vehicle => {
  const statusLabel = STATUS_LABELS[v.status] ?? String(v.status);

  return {
    id: String(v.id),
    sido: v.sido ?? "",
    // 🔥 stationId → 소방서 이름 매핑
    station: stationMap?.get(v.stationId) ?? "",
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

/* ========= 탭 관련 ========= */
type TabKey = "general" | "byDate" | "byRegion" | "byType" | "byDuration";

const MENU: { key: TabKey; label: string }[] = [
  { key: "general", label: "일반" },
  { key: "byDate", label: "일시별" },
  { key: "byRegion", label: "시도별" },
  { key: "byType", label: "차종별" },
  { key: "byDuration", label: "활동 시간별" },
];

/* ========= 페이지 컴포넌트 ========= */
export default function StatisticsPage() {
  const [menuOpen, setMenuOpen] = useState<boolean>(true);
  const [tab, setTab] = useState<TabKey>("general");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [summary, setSummary] = useState<ApiStats | null>(null);

  const [fetching, setFetching] = useState(false);

  const fetchAll = async () => {
    try {
      setFetching(true);

      // 🔥 차량 + 소방서 + 통계 요약을 동시에 요청
      const [vehicleRes, stationRes, statsRes] = await Promise.all([
        api.get<ApiVehicleListItem[]>("/vehicles"),
        api.get<ApiFireStation[]>("/fire-stations"),
        api.get<ApiStats>("/stats"),
      ]);

      const vehicleList = vehicleRes.data ?? [];
      const stations = stationRes.data ?? [];
      const stats = statsRes.data ?? null;

      // 🔥 id → 소방서 이름 매핑 테이블
      const stationMap = new Map<number, string>();
      stations.forEach((s) => {
        stationMap.set(s.id, s.name);
      });

      // 🔥 Vehicle에 station 이름 주입
      const mapped = vehicleList.map((v) => mapApiToVehicle(v, stationMap));

      setVehicles(mapped);
      setSummary(stats);
    } catch (e) {
      console.error(e);
      alert("차량/소방서/통계 정보를 불러오지 못했습니다.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchAll();
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
            onClick={fetchAll}
            disabled={fetching}
            title="서버에서 최신 통계/차량/소방서 정보 재조회"
          >
            {fetching ? "불러오는 중..." : "새로고침"}
          </button>
        </div>
      </div>

      {/* 🔥 페이지 상단 공통 통계 요약 영역 */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KPI
            title="등록 차량 수"
            value={
              summary?.totalVehicles ??
              vehicles.length.toLocaleString()
            }
          />
          <KPI
            title="총 출동 건수"
            value={summary?.totalDispatchCount ?? "-"}
          />
          <KPI
            title="총 활동 시간(분)"
            value={summary?.totalMinutes ?? "-"}
          />
        </div>
        {/* 필요하다면 추가 KPI도 요 아래에 더 배치 가능 */}
        {/* 예: 평균 활동시간, 금일 출동 건수 등 */}
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
