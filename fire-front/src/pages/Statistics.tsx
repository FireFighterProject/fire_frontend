// src/pages/Statistics.tsx
import React, { useMemo, useState } from "react";
/* ========= 샘플 타입/데이터 (API 연동 시 교체) ========= */
import type { Vehicle } from "../types/global";
import { DUMMY_VEHICLES as VEHICLES } from "../data/vehicles";
import { DUMMY_LOGS as LOGS } from "../data/logs";
/* ========= 유틸 ========= */
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));
const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);
const avg = (arr: number[]) => (arr.length ? Math.round(sum(arr) / arr.length) : 0);
const by = <T, K extends string | number>(arr: T[], key: (x: T) => K) =>
  arr.reduce<Record<K, T[]>>((m, x) => {
    const k = key(x);
    (m[k] ??= []).push(x);
    return m;
  }, {} as any);

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
const TabGeneral: React.FC = () => {
  const [sido, setSido] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);

  const filtered = useMemo(
    () => VEHICLES.filter((v) => (!sido || v.sido === sido) && (!type || v.type === type)),
    [sido, type]
  );
  const logs = useMemo(
    () => LOGS.filter((l) => l.vehicleId === detailVehicle?.id).sort((a, b) => (a.dispatchTime < b.dispatchTime ? 1 : -1)),
    [detailVehicle]
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KPI title="등록 차량" value={VEHICLES.length} />
        <KPI title="총 인원 합계" value={sum(VEHICLES.map((v) => v.personnel ?? 0))} />
        <KPI title="평균 활동 시간(분/대)" value={avg(LOGS.map((l) => l.minutes))} />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="flex flex-col">
          <span className="mb-1 text-xs text-gray-600">1차 필터 (시/도)</span>
          <select className="h-9 min-w-[180px] rounded-lg border border-gray-300 px-2" value={sido} onChange={(e) => setSido(e.target.value)}>
            <option value="">전체</option>
            {uniq(VEHICLES.map((v) => v.sido)).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-xs text-gray-600">2차 필터 (차종)</span>
          <select className="h-9 min-w-[180px] rounded-lg border border-gray-300 px-2" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">전체</option>
            {uniq(VEHICLES.map((v) => v.type)).map((t) => (
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
              <button className="text-blue-600 underline-offset-2 hover:underline" onClick={() => setDetailVehicle(v)} title="활동 이력 보기">
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
          rows={logs.map((l) => ({
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
const TabByRegion: React.FC = () => {
  const grouped = useMemo(() => by(LOGS, (l) => VEHICLES.find((v) => v.id === l.vehicleId)?.sido || "미상"), []);
  const rows = Object.entries(grouped).map(([sido, logs]) => ({
    sido,
    cnt: logs.length,
    vehicles: uniq(logs.map((l) => VEHICLES.find((v) => v.id === l.vehicleId)!.callname)).length,
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
const TabByType: React.FC = () => {
  const grouped = useMemo(() => by(LOGS, (l) => VEHICLES.find((v) => v.id === l.vehicleId)?.type || "미상"), []);
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
    vehicles: uniq(logs.map((l) => l.vehicleId)).length,
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

/* ========= 탭: 출동 명령별 (메모 가능) ========= */
const TabByCommand: React.FC = () => {
  const grouped = useMemo(() => by(LOGS, (l) => l.command), []);
  const items = Object.entries(grouped).map(([cmd, logs]) => ({
    cmd,
    cnt: logs.length,
    minutes: sum(logs.map((l) => l.minutes)),
  }));

  const [memoMap, setMemoMap] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [temp, setTemp] = useState("");

  const max = Math.max(...items.map((x) => x.minutes), 1);

  const save = () => {
    if (!editing) return;
    setMemoMap((m) => ({ ...m, [editing]: temp }));
    setEditing(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KPI title="총 활동시간(분)" value={sum(items.map((x) => x.minutes))} />
        <KPI title="평균(분/대)" value={avg(LOGS.map((l) => l.minutes))} />
        <KPI title="최대(분/대)" value={Math.max(...LOGS.map((l) => l.minutes))} />
      </div>

      <div className="mt-3">
        <Table
          columns={[
            { key: "cmd", header: "명령", align: "left" },
            { key: "cnt", header: "출동 건수", width: "120px", align: "right" },
            { key: "minutes", header: "총 활동시간(분)", width: "160px", align: "right" },
            { key: "bar", header: "미니차트" },
            { key: "memo", header: "메모", align: "left" },
          ]}
          rows={items.map((r) => ({
            cmd: (
              <button className="text-blue-600 underline-offset-2 hover:underline" onClick={() => { setEditing(r.cmd); setTemp(memoMap[r.cmd] ?? ""); }}>
                {r.cmd}
              </button>
            ),
            cnt: r.cnt.toLocaleString(),
            minutes: r.minutes.toLocaleString(),
            bar: <MiniBar value={r.minutes} max={max} />,
            memo: memoMap[r.cmd] ?? "-",
          }))}
        />
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `메모: ${editing}` : ""}>
        <textarea
          className="h-40 w-full resize-y rounded-xl border border-gray-300 p-3"
          placeholder="출동 명령에 대한 비고/메모를 작성하세요."
          value={temp}
          onChange={(e) => setTemp(e.target.value)}
        />
        <div className="mt-3 flex justify-end gap-2">
          <button className="h-9 rounded-lg border border-gray-300 px-3 hover:bg-gray-50" onClick={() => setEditing(null)}>
            취소
          </button>
          <button className="h-9 rounded-lg bg-red-600 px-4 text-white hover:bg-red-700" onClick={save}>
            저장
          </button>
        </div>
      </Modal>
    </>
  );
};

/* ========= 탭: 활동 시간별 ========= */
const TabByDuration: React.FC = () => {
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
            const v = VEHICLES.find((x) => x.id === l.vehicleId)!;
            return {
              no: i + 1,
              command: `${v.callname} / ${l.command}`,
              type: v.type,
              sido: v.sido,
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

  return (
    <div className="flex h-full flex-col">
      {/* 상단 툴바 (공통 헤더 아래 영역) */}
      <div className="flex h-11 items-center gap-2 border-b border-gray-200 bg-white px-3">
        <button className="h-8 w-8 rounded-lg border border-gray-300 hover:bg-gray-50" onClick={() => setMenuOpen((v) => !v)}>
          ≡
        </button>
        <div className="font-semibold">통계</div>
      </div>

      <div className="relative grid flex-1 grid-cols-[240px_1fr] overflow-hidden">
        <SideMenu open={menuOpen} active={tab} onSelect={setTab} />

        <main className="overflow-auto p-4">
          {tab === "general" && <TabGeneral />}
          {tab === "byDate" && <TabByDate />}
          {tab === "byRegion" && <TabByRegion />}
          {tab === "byType" && <TabByType />}
          {tab === "byPlace" && <TabByPlace />}
          {tab === "byCommand" && <TabByCommand />}
          {tab === "byDuration" && <TabByDuration />}
        </main>
      </div>
    </div>
  );
}
