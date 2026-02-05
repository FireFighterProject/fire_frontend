// src/pages/Statistics.tsx
import { useEffect, useState } from "react";
import axios from "axios";

/* ========= 타입 ========= */
import type { Vehicle } from "../types/global";
import type { StatLog } from "../types/stats";

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

type ApiStats = {
  totalVehicles?: number;
  totalDispatchCount?: number;
  totalMinutes?: number;
  // 필요하면 나중에 필드 추가
  [key: string]: unknown;
};

// /api/logs 원본 이벤트 타입
type ApiLogEvent = {
  id: number;
  vehicleId: number;
  orderId: number;
  batchNo: number;
  eventType: string;
  address: string;
  content: string;
  memo: string;
  eventTime: string; // ISO 문자열
};

/* ========= 상태 라벨 ========= */
const STATUS_LABELS: Record<number, Vehicle["status"] | string> = {
  0: "대기",
  1: "출동중",
  2: "철수",
  3: "집결중",
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

/* ========= /api/logs → StatLog 변환 ========= */
// 백엔드 이벤트 형식이 '출동/복귀' 쌍인지 아직 몰라서
// 일단 1 이벤트 = 1 StatLog 로 단순 매핑 (분=0) 해둘게.
// 나중에 eventType 보고 출동/복귀 묶는 로직으로 바꿔도 됨.
const buildStatLogs = (events: ApiLogEvent[]): StatLog[] => {
  return events.map((e) => {
    const date = e.eventTime.slice(0, 10); // yyyy-MM-dd
    return {
      id: e.id,
      vehicleId: e.vehicleId,
      orderId: e.orderId,
      date,
      dispatchTime: e.eventTime,
      returnTime: e.eventTime,
      dispatchPlace: e.address,
      moved: false,
      minutes: 0,
      command: e.content,
      crewCount: 0,
    };
  });
};

/* ========= /api/logs 쿼리용 날짜 포맷터 ========= */
// KST 기준 30일 전 ~ 지금
const formatDateParam = (d: Date) => {
  // 백엔드가 'yyyy-MM-ddTHH:mm:ss' 형식일 가능성이 높아서
  // ISO에서 초까지 자르고 'Z'와 ms는 제거
  return d.toISOString().slice(0, 19);
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
  const [logs, setLogs] = useState<StatLog[]>([]);
  const [summary, setSummary] = useState<ApiStats | null>(null);

  const [fetching, setFetching] = useState(false);

  const fetchAll = async () => {
    try {
      setFetching(true);

      // 🔥 최근 30일 로그 조회용 from/to
      const now = new Date();
      const to = formatDateParam(now);
      const fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 30);
      const from = formatDateParam(fromDate);

      // 🔥 차량 + 소방서 + 통계 요약 + 로그를 동시에 요청
      const [vehicleRes, stationRes, statsRes, logsRes] = await Promise.all([
        api.get<ApiVehicleListItem[]>("/vehicles"),
        api.get<ApiFireStation[]>("/fire-stations"),
        api.get<ApiStats>("/stats"),
        api.get<ApiLogEvent[]>("/logs", {
          params: { from, to },
        }),
      ]);

      const vehicleList = vehicleRes.data ?? [];
      const stations = stationRes.data ?? [];
      const stats = statsRes.data ?? {};
      const rawEvents = logsRes.data ?? [];

      // 🔥 id → 소방서 이름 매핑 테이블
      const stationMap = new Map<number, string>();
      stations.forEach((s) => {
        stationMap.set(s.id, s.name);
      });

      // 🔥 Vehicle에 station 이름 주입
      const mappedVehicles = vehicleList.map((v) =>
        mapApiToVehicle(v, stationMap)
      );

      // 🔥 /api/logs → StatLog[]
      const statLogs = buildStatLogs(rawEvents);

      // 디버깅용 (원하면 지워도 됨)
      console.log("raw /api/logs events", rawEvents);
      console.log("statLogs (출동단위)", statLogs);

      setVehicles(mappedVehicles);
      setLogs(statLogs);
      setSummary(stats);
    } catch (e) {
      console.error(e);
      alert("차량/소방서/통계/로그 정보를 불러오지 못했습니다.");
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
            title="서버에서 최신 통계/차량/소방서/로그 정보 재조회"
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
          {tab === "general" && (
            <GeneralTab vehicles={vehicles} logs={logs} />
          )}
          {tab === "byDate" && <DateTab logs={logs} />}
          {tab === "byRegion" && (
            <RegionTab vehicles={vehicles} logs={logs} />
          )}
          {tab === "byType" && (
            <TypeTab vehicles={vehicles} logs={logs} />
          )}
          {tab === "byDuration" && (
            <DurationTab vehicles={vehicles} logs={logs} />
          )}
        </main>
      </div>
    </div>
  );
}
