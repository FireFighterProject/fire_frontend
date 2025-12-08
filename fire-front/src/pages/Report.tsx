// src/pages/Report.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type { VehicleStatus } from "../types/global";

/* UTILS */
function groupBy<T, K extends string | number>(
  arr: T[],
  keyFn: (x: T) => K
): Record<K, T[]> {
  return arr.reduce((m, x) => {
    const k = keyFn(x);
    (m[k] ??= []).push(x);
    return m;
  }, {} as Record<K, T[]>);
}

const unique = <T,>(arr: T[]) => Array.from(new Set(arr));

/* FireStation 타입 */
type ApiFireStation = {
  id: number;
  sido: string;
  name: string;
  address: string;
};

/* Topic Types */
type Topic =
  | "전체 통계"
  | "지역별 통계"
  | "차종별 통계"
  | "상태별 통계"
  | "출동 목록";

type TabStep = 1 | 2 | 3 | 4;

export default function ReportPage() {
  const vehicles = useSelector((s: RootState) => s.vehicle.vehicles);

  const [step, setStep] = useState<TabStep>(1);
  const [topic, setTopic] = useState<Topic>("전체 통계");

  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");

  const [stations, setStations] = useState<ApiFireStation[]>([]);

  /* -------------------------
   * 🔥 소방서 목록 불러오기
   * ------------------------- */
  useEffect(() => {
    async function loadStations() {
      try {
        const res = await fetch("/api/fire-stations");
        const data = await res.json();
        setStations(data);
      } catch (err) {
        console.error("Failed to load stations", err);
      }
    }
    loadStations();
  }, []);

  /* 🔥 vehicle + station 매핑 */
  const vehiclesWithStation = useMemo(() => {
    const stationMap = new Map(stations.map((s) => [s.id, s]));
    return vehicles.map((v) => ({
      ...v,
      stationInfo: stationMap.get(v.stationId) || null,
    }));
  }, [vehicles, stations]);

  /* Filters */
  const sidos = useMemo(
    () => unique(vehicles.map((v) => v.sido)),
    [vehicles]
  );
  const types = useMemo(
    () => unique(vehicles.map((v) => v.type)),
    [vehicles]
  );

  const [filterSido, setFilterSido] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] =
    useState<"" | VehicleStatus>("");

  const [title, setTitle] = useState<string>("");
  const [memo, setMemo] = useState<string>("");

  /* Load Draft */
  useEffect(() => {
    const draft = localStorage.getItem("report_draft");
    if (!draft) return;

    try {
      const data = JSON.parse(draft);
      setTopic(data.topic ?? "전체 통계");
      setPeriodStart(data.periodStart ?? "");
      setPeriodEnd(data.periodEnd ?? "");
      setFilterSido(data.filterSido ?? "");
      setFilterType(data.filterType ?? "");
      setFilterStatus(data.filterStatus ?? "");
      setTitle(data.title ?? "");
      setMemo(data.memo ?? "");
    } catch (err) {
      console.warn("Failed to load draft:", err);
    }
  }, []);

  /* -------------------------
   * 🔥 필터링 적용 (station 매핑된 데이터 사용)
   * ------------------------- */
  const filteredVehicles = useMemo(() => {
    return vehiclesWithStation.filter((v) => {
      if (filterSido && v.sido !== filterSido) return false;
      if (filterType && v.type !== filterType) return false;
      if (filterStatus && v.status !== filterStatus) return false;
      return true;
    });
  }, [vehiclesWithStation, filterSido, filterType, filterStatus]);

  /* -------------------------
   * 🔥 집계
   * ------------------------- */
  const aggregates = useMemo(() => {
    const bySido = groupBy(filteredVehicles, (v) => v.sido);
    const byType = groupBy(filteredVehicles, (v) => v.type);
    const byStatus = groupBy(filteredVehicles, (v) => v.status);

    const totalVehicles = filteredVehicles.length;
    const totalPersonnel = filteredVehicles.reduce(
      (s, v) => s + (Number(v.personnel) || 0),
      0
    );

    const dispatchedStatuses: VehicleStatus[] = ["출동중", "활동"];
    const dispatched = filteredVehicles.filter((v) =>
      dispatchedStatuses.includes(v.status as VehicleStatus)
    );

    return {
      totalVehicles,
      totalPersonnel,
      bySido,
      byType,
      byStatus,
      dispatched,
    };
  }, [filteredVehicles]);

  /* 임시저장 */
  const handleTempSave = () => {
    const payload = {
      topic,
      periodStart,
      periodEnd,
      filterSido,
      filterType,
      filterStatus,
      title,
      memo,
    };
    localStorage.setItem("report_draft", JSON.stringify(payload));
    alert("임시저장 완료!");
  };

  /* PDF 출력 */
  const handlePrint = () => {
    const printContents =
      document.getElementById("print-area")?.innerHTML;
    if (!printContents)
      return alert("print-area를 찾을 수 없습니다.");

    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;

    window.print();

    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  return (
    <div className="flex h-[calc(100vh-64px)] gap-4 p-4 text-gray-800 min-h-0">
      {/* Sidebar */}
      <aside className="w-[260px] shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-y-auto">
        {/* Step 1 */}
        <div className="border-b p-4">
          <p className="mb-2 text-sm font-semibold">
            STEP 1. 보고서 주제
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                "전체 통계",
                "지역별 통계",
                "차종별 통계",
                "상태별 통계",
                "출동 목록",
              ] as Topic[]
            ).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTopic(t);
                  setStep(2);
                }}
                className={`rounded-md border px-2 py-1 text-xs hover:bg-gray-50 
                ${topic === t
                    ? "border-red-500 text-red-600"
                    : "border-gray-200"
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 */}
        <div className="border-b p-4">
          <p className="mb-3 text-sm font-semibold">
            STEP 2. 필터/항목 선택
          </p>

          <Labeled label="기간 (시작일)">
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </Labeled>

          <Labeled label="기간 (종료일)">
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </Labeled>

          <Labeled label="지역 (시/도)">
            <select
              value={filterSido}
              onChange={(e) => setFilterSido(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">전체</option>
              {sidos.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Labeled>

          <Labeled label="차종">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">전체</option>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Labeled>

          <Labeled label="상태">
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value as VehicleStatus | ""
                )
              }
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">전체</option>
              {(
                [
                  "대기",
                  "활동",
                  "대기중",
                  "출동중",
                  "복귀",
                  "철수",
                ] as VehicleStatus[]
              ).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Labeled>

          <button
            onClick={() => setStep(3)}
            className="mt-2 w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            작성하기
          </button>

          <button
            onClick={handleTempSave}
            className="mt-4 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            임시저장
          </button>
        </div>

        {/* Step 3 */}
        <div className="p-4">
          <p className="text-sm font-semibold mb-2">
            보고서 내용 작성
          </p>

          <Labeled label="보고서 제목">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 9월 1주차 차량 현황 보고"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </Labeled>

          <Labeled label="메모 / 비고">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm resize-none"
            />
          </Labeled>

          <button
            onClick={() => setStep(4)}
            className="mt-2 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            출력/저장 단계로
          </button>
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            {(`
              1: '1.주제',
              2: '2.설정',
              3: '3.작성',
              4: '4.출력'
            `)}
            {([1, 2, 3, 4] as TabStep[]).map((n) => {
              const labels: Record<TabStep, string> = {
                1: "1.주제",
                2: "2.설정",
                3: "3.작성",
                4: "4.출력",
              };
              return (
                <button
                  key={n}
                  onClick={() => setStep(n)}
                  className={`rounded-full px-3 py-1 text-sm ${step === n
                      ? "bg-gray-900 text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  {labels[n]}
                </button>
              );
            })}
          </div>

          <button
            onClick={handlePrint}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            PDF 출력
          </button>
        </div>

        {/* Print Area */}
        <div className="h-full overflow-auto p-4 print:p-0">
          <div
            id="print-area"
            className="mx-auto w-full max-w-[1100px] space-y-4 print:rounded-none print:border-none print:shadow-none"
          >
            {/* Header */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold">
                동원차량 관리 프로그램 – 보고서
              </h2>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleString()} · {topic}
              </p>
            </div>

            {/* Info */}
            <PreviewSection title="보고서 정보">
              <InfoRow
                label="제목"
                value={title || "제목 미입력"}
              />
              <InfoRow
                label="기간"
                value={`${periodStart || "—"} ~ ${periodEnd || "—"
                  }`}
              />
              <InfoRow
                label="필터"
                value={
                  filterSido ||
                    filterType ||
                    filterStatus
                    ? `${filterSido || "전체"} / ${filterType || "전체"
                    } / ${filterStatus || "전체"}`
                    : "없음"
                }
              />
              {memo && <InfoRow label="메모" value={memo} />}
            </PreviewSection>

            {/* KPIs */}
            <PreviewSection title="집계 요약">
              <div className="grid gap-3 sm:grid-cols-4">
                <KPICard
                  label="총 차량 수"
                  value={`${aggregates.totalVehicles}대`}
                />
                <KPICard
                  label="총 인원 수"
                  value={`${aggregates.totalPersonnel}명`}
                />
                <KPICard
                  label="출동(활동·출동중)"
                  value={`${aggregates.dispatched.length}대`}
                />
                <KPICard label="주제" value={topic} />
              </div>
            </PreviewSection>

            {/* By Sido */}
            <PreviewSection title="지역별 차량 수">
              <SimpleTable
                headers={["시도", "대수"]}
                rows={Object.entries(aggregates.bySido).map(
                  ([k, arr]) => [k, arr.length]
                )}
              />
            </PreviewSection>

            {/* By Type */}
            <PreviewSection title="차종별 차량 수">
              <SimpleTable
                headers={["차종", "대수"]}
                rows={Object.entries(aggregates.byType).map(
                  ([k, arr]) => [k, arr.length]
                )}
              />
            </PreviewSection>

            {/* By Status */}
            <PreviewSection title="상태별 차량 수">
              <SimpleTable
                headers={["상태", "대수"]}
                rows={Object.entries(aggregates.byStatus).map(
                  ([k, arr]) => [k, arr.length]
                )}
              />
            </PreviewSection>

            {/* Dispatched Vehicles */}
            <PreviewSection title="출동(활동·출동중) 차량">
              <SimpleTable
                headers={[
                  "호출명",
                  "시도",
                  "소방서",
                  "차종",
                  "상태",
                  "츌동장소",
                  "연락처",
                ]}
                rows={aggregates.dispatched.map((v) => [
                  v.callname,
                  v.sido,
                  v.stationInfo?.name || "-",
                  v.type,
                  v.status,
                  v.stationInfo?.address || "-",
                  v.avl || "-",
                ])}
              />
            </PreviewSection>
          </div>
        </div>
      </main>
    </div>
  );
}

/* --------------------------------
 * COMPONENTS
 * -------------------------------- */
function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex text-sm mb-1">
      <div className="w-32 text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function KPICard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="bg-gray-100">
            {headers.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap border-b px-3 py-2 text-left font-semibold text-gray-700"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                className="px-3 py-6 text-center text-gray-500"
                colSpan={headers.length}
              >
                데이터가 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="even:bg-gray-50">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="whitespace-nowrap border-t px-3 py-2 text-gray-800"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs text-gray-600">{label}</p>
      {children}
    </div>
  );
}
