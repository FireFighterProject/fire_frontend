// src/pages/Statistics.tsx
import React, { useEffect, useMemo, useState } from "react";
/* ========= 타입 ========= */
import type { Vehicle } from "../types/global";
/* ========= 로그 더미 (차량은 API로 대체) ========= */
import { DUMMY_LOGS as LOGS } from "../data/logs";
import axios from "axios";

/* ========= 유틸 ========= */
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));
const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);
const avg = (arr: number[]) => (arr.length ? Math.round(sum(arr) / arr.length) : 0);
const by = <T, K extends string | number>(arr: T[], key: (x: T) => K) =>
  arr.reduce<Record<K, T[]>>((m, x) => {
    const k = key(x);
    (m[k] ??= []).push(x);
    return m;
  }, {} as Record<K, T[]>);

/* ========= 서버 응답(차량) & 매핑 ========= */
type ApiVehicleListItem = {
  id: number;
  stationId: number;
  sido: string;
  typeName: string;
  callSign: string;
  status: number;      // 0=대기, 1=출동중 (백엔드 정의)
  rallyPoint: number;  // 0/1
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
    station: "", // 서버 응답에 소방서명 없음 → 필요 시 /api/fire-stations로 조인하여 채우기
    type: v.typeName ?? "",
    callname: v.callSign ?? "",
    capacity: Number.isFinite(v.capacity as number) ? (v.capacity as number) : 0,
    personnel: Number.isFinite(v.personnel as number) ? (v.personnel as number) : 0,
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

/* ========= 공통 컴포넌트 (Tailwind) ========= */
const KPI: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4">
    <div className="text-xs text-gray-500">{title}</div>
    <div className="mt-1 text-2xl font-bold">{value}</div>
  </div>
);

const Table: React.FC<{
  columns: { key: string; header: string; width?: string; align?: "left" | "center" | "right" }[];
  rows: Record<string, React.ReactNode>[];
  emptyText?: string;
}> = ({ columns, rows, emptyText = "데이터가 없습니다." }) => (
  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="bg-gray-50 text-gray-700">
          {columns.map((c) => (
            <th
              key={c.key}
              className={`px-3 py-2 font-semibold ${c.align === "left" ? "text-left" : c.align === "right" ? "text-right" : "text-center"}`}
              style={{ width: c.width }}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td className="px-3 py-8 text-center text-gray-500" colSpan={columns.length}>
              {emptyText}
            </td>
          </tr>
        ) : (
          rows.map((r, i) => (
            <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2 ${c.align === "left" ? "text-left" : c.align === "right" ? "text-right" : "text-center"}`}
                >
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({
  open,
  onClose,
  title,
  children,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-[min(900px,92vw)] max-h-[80vh] overflow-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 p-3">
          <div className="text-base font-bold">{title}</div>
          <button className="h-8 w-8 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

const MiniBar: React.FC<{ value: number; max: number; legend?: string }> = ({ value, max, legend }) => {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      {legend && <span className="text-xs text-gray-500">{legend}</span>}
    </div>
  );
};

/* ========= 좌측 메뉴 ========= */
type TabKey = "general" | "byDate" | "byRegion" | "byType" | "byPlace" | "byCommand" | "byDuration";

const MENU: { key: TabKey; label: string }[] = [
  { key: "general", label: "일반" },
  { key: "byDate", label: "일시별" },
  { key: "byRegion", label: "시도별" },
  { key: "byType", label: "차종별" },
  { key: "byPlace", label: "장소별" },
  { key: "byCommand", label: "출동 명령별" },
  { key: "byDuration", label: "활동 시간별" },
];

const SideMenu: React.FC<{
  open: boolean;
  active: TabKey;
  onSelect: (t: TabKey) => void;
}> = ({ open, active, onSelect }) => (
  <aside
    className={`z-10 border-r border-gray-200 bg-gray-50 transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"} w-60`}
  >
    <div className="px-4 pb-2 pt-3 text-xs text-gray-600">통계항목</div>
    <ul className="space-y-1 p-2">
      {MENU.map((m) => (
        <li key={m.key}>
          <button
            onClick={() => onSelect(m.key)}
            className={`w-full rounded-lg border px-3 py-2 text-left hover:bg-white ${active === m.key ? "border-gray-300 bg-white font-semibold" : "border-transparent"
              }`}
          >
            {m.label}
          </button>
        </li>
      ))}
    </ul>
  </aside>
);

/* ========= 탭: 일반 ========= */
const TabGeneral: React.FC<{ vehicles: Vehicle[] }> = ({ vehicles }) => {
  const [sido, setSido] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);

  const filtered = useMemo(
    () => vehicles.filter((v) => (!sido || v.sido === sido) && (!type || v.type === type)),
    [vehicles, sido, type]
  );

  const logsForDetail = useMemo(
    () =>
      LOGS
        .filter((l) => String(l.vehicleId) === (detailVehicle?.id ?? ""))
        .sort((a, b) => (a.dispatchTime < b.dispatchTime ? 1 : -1)),
    [detailVehicle]
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KPI title="등록 차량" value={vehicles.length} />
        <KPI title="총 인원 합계" value={sum(vehicles.map((v) => Number(v.personnel) || 0))} />
        <KPI title="평균 활동 시간(분/대)" value={avg(LOGS.map((l) => l.minutes))} />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="flex flex-col">
          <span className="mb-1 text-xs text-gray-600">1차 필터 (시/도)</span>
          <select className="h-9 min-w-[180px] rounded-lg border border-gray-300 px-2" value={sido} onChange={(e) => setSido(e.target.value)}>
            <option value="">전체</option>
            {uniq(vehicles.map((v) => v.sido)).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-xs text-gray-600">2차 필터 (차종)</span>
          <select className="h-9 min-w-[180px] rounded-lg border border-gray-300 px-2" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">전체</option>
            {uniq(vehicles.map((v) => v.type)).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3">
        <Table
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

      <Modal open={!!detailVehicle} onClose={() => setDetailVehicle(null)} title={detailVehicle ? `차량 이력: ${detailVehicle.callname}` : ""}>
        <Table
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
      </Modal>
    </>
  );
};

/* ========= 탭: 일시별 ========= */
const TabByDate: React.FC = () => {
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
        <KPI title="총 활동시간(분)" value={sum(list.map((l) => l.minutes))} />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="flex flex-col">
          <span className="mb-1 text-xs text-gray-600">시작</span>
          <input className="h-9 rounded-lg border border-gray-300 px-2" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-xs text-gray-600">끝</span>
          <input className="h-9 rounded-lg border border-gray-300 px-2" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      <div className="mt-3">
        <Table
          columns={[
            { key: "date", header: "날짜", width: "120px" },
            { key: "dispatch", header: "출동" },
            { key: "return", header: "복귀" },
            { key: "moved", header: "장소이동", width: "100px" },
            { key: "mins", header: "총 활동시간(분)", width: "160px", align: "right" },
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

/* ========= 탭: 시도별 ========= */
const TabByRegion: React.FC<{ vehicles: Vehicle[] }> = ({ vehicles }) => {
  const grouped = useMemo(
    () => by(LOGS, (l) => vehicles.find((v) => v.id === String(l.vehicleId))?.sido || "미상"),
    [vehicles]
  );
  const rows = Object.entries(grouped).map(([sido, logs]) => ({
    sido,
    cnt: logs.length,
    vehicles: uniq(logs.map((l) => String(l.vehicleId))).length,
    minutes: sum(logs.map((l) => l.minutes)),
  }));

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KPI title="시도 수" value={rows.length} />
        <KPI title="총 출동 건수" value={sum(rows.map((r) => r.cnt))} />
        <KPI title="평균 활동시간(분/시도)" value={avg(rows.map((r) => r.minutes))} />
      </div>

      <div className="mt-3">
        <Table
          columns={[
            { key: "sido", header: "시도", align: "left" },
            { key: "cnt", header: "출동 건수", width: "120px", align: "right" },
            { key: "vehicles", header: "참여 차량수", width: "120px", align: "right" },
            { key: "minutes", header: "총 활동시간(분)", width: "160px", align: "right" },
          ]}
          rows={rows
            .sort((a, b) => b.minutes - a.minutes)
            .map((r) => ({
              sido: r.sido,
              cnt: r.cnt.toLocaleString(),
              vehicles: r.vehicles.toLocaleString(),
              minutes: r.minutes.toLocaleString(),
            }))}
        />
      </div>
    </>
  );
};

/* ========= 탭: 차종별 ========= */
const TabByType: React.FC<{ vehicles: Vehicle[] }> = ({ vehicles }) => {
  const grouped = useMemo(
    () => by(LOGS, (l) => vehicles.find((v) => v.id === String(l.vehicleId))?.type || "미상"),
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
        <KPI title="평균 활동시간(분/차종)" value={avg(rows.map((r) => r.minutes))} />
      </div>

      <div className="mt-3">
        <Table
          columns={[
            { key: "type", header: "차종", align: "left" },
            { key: "cnt", header: "출동 건수", width: "120px", align: "right" },
            { key: "crew", header: "참여 인원수", width: "120px", align: "right" },
            { key: "minutes", header: "총 활동시간(분)", width: "160px", align: "right" },
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

/* ========= 탭: 장소별 ========= */
const TabByPlace: React.FC = () => {
  const grouped = useMemo(() => by(LOGS, (l) => l.dispatchPlace.split(" ")[0] ?? "미상"), []);
  const rows = Object.entries(grouped).map(([place, logs]) => ({
    place,
    cnt: logs.length,
    vehicles: uniq(logs.map((l) => String(l.vehicleId))).length,
    minutes: sum(logs.map((l) => l.minutes)),
  }));

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KPI title="장소 수" value={rows.length} />
        <KPI title="총 출동 건수" value={sum(rows.map((r) => r.cnt))} />
        <KPI title="평균 소요(분/장소)" value={avg(rows.map((r) => r.minutes))} />
      </div>

      <div className="mt-3">
        <Table
          columns={[
            { key: "place", header: "출동 장소", align: "left" },
            { key: "cnt", header: "출동 건수", width: "120px", align: "right" },
            { key: "vehicles", header: "참여 차량수", width: "120px", align: "right" },
            { key: "minutes", header: "총 활동시간(분)", width: "160px", align: "right" },
          ]}
          rows={rows.map((r) => ({
            place: r.place,
            cnt: r.cnt.toLocaleString(),
            vehicles: r.vehicles.toLocaleString(),
            minutes: r.minutes.toLocaleString(),
          }))}
        />
      </div>
    </>
  );
};


/* ========= 탭: 활동 시간별 ========= */
const TabByDuration: React.FC<{ vehicles: Vehicle[] }> = ({ vehicles }) => {
  const sorted = useMemo(() => [...LOGS].sort((a, b) => b.minutes - a.minutes), []);
  const max = Math.max(...sorted.map((l) => l.minutes), 1);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KPI title="총 활동시간(분)" value={sum(LOGS.map((l) => l.minutes))} />
        <KPI title="평균(분/대)" value={avg(LOGS.map((l) => l.minutes))} />
        <KPI title="최대(분/대)" value={max} />
      </div>

      <div className="mt-3">
        <Table
          columns={[
            { key: "no", header: "연번", width: "70px" },
            { key: "command", header: "호출명/명령", align: "left" },
            { key: "type", header: "차종", width: "120px" },
            { key: "sido", header: "시도", width: "100px" },
            { key: "minutes", header: "총 활동시간(분)", width: "160px", align: "right" },
            { key: "bar", header: "미니차트" },
          ]}
          rows={sorted.map((l, i) => {
            const v = vehicles.find((x) => x.id === String(l.vehicleId));
            return {
              no: i + 1,
              command: v ? `${v.callname} / ${l.command}` : `(미상) / ${l.command}`,
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

/* ========= 페이지 루트 ========= */
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
      {/* 상단 툴바 (공통 헤더 아래 영역) */}
      <div className="flex h-11 items-center gap-2 border-b border-gray-200 bg-white px-3">
        <button className="h-8 w-8 rounded-lg border border-gray-300 hover:bg-gray-50" onClick={() => setMenuOpen((v) => !v)}>
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
        <SideMenu open={menuOpen} active={tab} onSelect={setTab} />

        <main className="overflow-auto p-4">
          {tab === "general" && <TabGeneral vehicles={vehicles} />}
          {tab === "byDate" && <TabByDate />}
          {tab === "byRegion" && <TabByRegion vehicles={vehicles} />}
          {tab === "byType" && <TabByType vehicles={vehicles} />}
          {tab === "byPlace" && <TabByPlace />}
          {tab === "byDuration" && <TabByDuration vehicles={vehicles} />}
        </main>
      </div>
    </div>
  );
}
