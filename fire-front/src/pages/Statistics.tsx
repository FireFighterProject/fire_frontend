/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/Statistics.tsx
import { useEffect, useState } from "react";
import axios from "axios";

/* ========= 타입 ========= */
import type { Vehicle } from "../types/global";
import type { RawLogEvent, StatLog } from "../types/stats";

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
  status: number; // 0=대기, 1=출동중
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
};

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

/* ========= 날짜 포맷 유틸 (LocalDateTime용) ========= */
// 예: 2025-12-08T16:50:27.608Z  ->  2025-12-08T16:50:27
const formatDateParam = (d: Date): string => {
  return d.toISOString().slice(0, 19);
};

/* ========= 서버 → Vehicle 매핑 ========= */
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

/* ========= RawLogEvent[] → StatLog[] 집계 ========= */
const buildStatLogs = (events: RawLogEvent[]): StatLog[] => {
  const groups = new Map<string, RawLogEvent[]>();

  // vehicleId + orderId 단위로 묶기
  events.forEach((ev) => {
    const key = `${ev.vehicleId}-${ev.orderId}`;
    const arr = groups.get(key);
    if (arr) {
      arr.push(ev);
    } else {
      groups.set(key, [ev]);
    }
  });

  const result: StatLog[] = [];

  groups.forEach((list) => {
    // 시간 순 정렬
    const sorted = [...list].sort((a, b) =>
      a.eventTime.localeCompare(b.eventTime)
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const startMs = Date.parse(first.eventTime);
    const endMs = Date.parse(last.eventTime);
    const minutes =
      Number.isFinite(startMs) &&
        Number.isFinite(endMs) &&
        endMs >= startMs
        ? Math.round((endMs - startMs) / 60000)
        : 0;

    const date = first.eventTime.slice(0, 10); // yyyy-MM-dd

    result.push({
      id: first.id,
      vehicleId: first.vehicleId,
      orderId: first.orderId,
      date,
      dispatchTime: first.eventTime,
      returnTime: last.eventTime,
      dispatchPlace: first.address ?? "",
      moved: sorted.length > 1,
      minutes,
      command: first.content ?? "",
      crewCount: 0, // 현재 API에서 알 수 없으니 0으로 둠
    });
  });

  return result;
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

      // ✅ 기본 조회 기간: 최근 30일
      const now = new Date();
      const to = formatDateParam(now);
      const fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 30);
      const from = formatDateParam(fromDate);

      // 🔥 차량 + 소방서 + 통계 + 로그 동시에 요청
      const [vehicleRes, stationRes, statsRes, logsRes] = await Promise.all([
        api.get<ApiVehicleListItem[]>("/vehicles"),
        api.get<ApiFireStation[]>("/fire-stations"),
        api.get<ApiStats>("/stats"),
        api.get<RawLogEvent[]>("/logs", {
          params: { from, to }, // ⬅ from/to 쿼리로 전송
        }),
      ]);

      const vehicleList = vehicleRes.data ?? [];
      const stations = stationRes.data ?? [];
      const stats = statsRes.data ?? null;
      const rawEvents = logsRes.data ?? [];

      // 🔥 id → 소방서 이름 매핑
      const stationMap = new Map<number, string>();
      stations.forEach((s) => stationMap.set(s.id, s.name));

      const mappedVehicles = vehicleList.map((v) =>
        mapApiToVehicle(v, stationMap)
      );

      // 🔥 Raw 이벤트 → 통계용 로그(출동 단위)로 집계
      const statLogs = buildStatLogs(rawEvents);

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

  // 총 활동시간(분) fallback 계산
  const totalMinutesFallback = logs
    .reduce((s, l) => s + (l.minutes || 0), 0)
    .toLocaleString();

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

      {/* 상단 요약 KPI */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KPI
            title="등록 차량 수"
            value={summary?.totalVehicles ?? vehicles.length.toLocaleString()}
          />
          <KPI
            title="총 출동 건수"
            value={summary?.totalDispatchCount ?? logs.length.toLocaleString()}
          />
          <KPI
            title="총 활동 시간(분)"
            value={summary?.totalMinutes ?? totalMinutesFallback}
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
          {tab === "byRegion" && (
            <RegionTab vehicles={vehicles} logs={logs} />
          )}
          {tab === "byType" && <TypeTab vehicles={vehicles} logs={logs} />}
          {tab === "byDuration" && (
            <DurationTab vehicles={vehicles} logs={logs} />
          )}
        </main>
      </div>
    </div>
  );
}
