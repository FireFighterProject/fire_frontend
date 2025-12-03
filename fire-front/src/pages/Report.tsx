// src/pages/ReportPage.tsx
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type {  VehicleStatus } from "../types/global";

/** --------------------------- 유틸 --------------------------- */
function groupBy<T, K extends string | number>(arr: T[], keyFn: (x: T) => K): Record<K, T[]> {
  return arr.reduce((m, x) => {
    const k = keyFn(x);
    (m[k] ??= []).push(x);
    return m;
  }, {} as Record<K, T[]>);
}
const unique = <T,>(arr: T[]) => Array.from(new Set(arr));

/** --------------------------- 타입 --------------------------- */
type Topic =
  | "전체 통계"
  | "지역별 통계"
  | "차종별 통계"
  | "상태별 통계"
  | "출동 목록";

type TabStep = 1 | 2 | 3 | 4;

/** --------------------------- 컴포넌트 --------------------------- */
export default function ReportPage() {
  
  const vehicles = useSelector((s: RootState) => s.vehicle.vehicles);

  /** 탭 & 폼 상태 */
  const [step, setStep] = useState<TabStep>(1);
  const [topic, setTopic] = useState<Topic>("전체 통계");

  // 기간 필터는 Vehicle 단일 스냅샷에서는 의미가 약해 보이므로 UI만 유지(향후 활동 로그 연동 대비)
  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");

  const sidos = useMemo(() => unique(vehicles.map((v) => v.sido)), [vehicles]);
  const types = useMemo(() => unique(vehicles.map((v) => v.type)), [vehicles]);

  const [filterSido, setFilterSido] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"" | VehicleStatus>("");

  /** 사용자 입력 가능한 필드 (AI가 채워주고, 사용자가 수정 가능) */
  const [title, setTitle] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [memo, setMemo] = useState<string>("");

  /** AI 진행 상태 */
  const [isAIGenerating, setIsAIGenerating] = useState<boolean>(false);

  /** 필터링된 차량 */
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (filterSido && v.sido !== filterSido) return false;
      if (filterType && v.type !== filterType) return false;
      if (filterStatus && v.status !== filterStatus) return false;
      return true;
    });
  }, [vehicles, filterSido, filterType, filterStatus]);

  /** 집계 */
  const aggregates = useMemo(() => {
    const bySido = groupBy(filteredVehicles, (v) => v.sido);
    const byType = groupBy(filteredVehicles, (v) => v.type);
    const byStatus = groupBy(filteredVehicles, (v) => v.status);

    const totalVehicles = filteredVehicles.length;
    const totalPersonnel = filteredVehicles.reduce((s, v) => s + (Number(v.personnel) || 0), 0);

    // 출동으로 볼 상태(업무 용어에 맞게 조정 가능)
    const dispatchedStatuses: VehicleStatus[] = ["출동중", "활동"];
    const dispatched = filteredVehicles.filter((v) => dispatchedStatuses.includes(v.status as VehicleStatus));

    return { totalVehicles, totalPersonnel, bySido, byType, byStatus, dispatched };
  }, [filteredVehicles]);

  /** --------------------------- AI(로컬 규칙 기반) --------------------------- */
  const generateWithAI = async () => {
    setIsAIGenerating(true);
    const dateRange =
      (periodStart || periodEnd) ? `${periodStart || "—"} ~ ${periodEnd || "—"}` : "현 시점";

    const topSido = Object.entries(aggregates.bySido).sort((a, b) => b[1].length - a[1].length)[0]?.[0];
    const topType = Object.entries(aggregates.byType).sort((a, b) => b[1].length - a[1].length)[0]?.[0];
    const topStatus = Object.entries(aggregates.byStatus).sort((a, b) => b[1].length - a[1].length)[0]?.[0];

    const newTitle =
      title.trim() ||
      `${dateRange} ${filterSido ? `${filterSido} ` : ""}${topic} 보고`;

    const parts: string[] = [];
    parts.push(
      `• 기간: ${dateRange}`,
      `• 총 차량 ${aggregates.totalVehicles}대, 총 인원 ${aggregates.totalPersonnel}명`,
      `• 출동(활동/출동중) 차량: ${aggregates.dispatched.length}대`
    );
    if (filterSido || filterType || filterStatus) {
      parts.push(`• 필터: ${filterSido || "전체"} / ${filterType || "전체"} / ${filterStatus || "전체"}`);
    }
    if (topSido) parts.push(`• 차량 집중 지역: ${topSido}`);
    if (topType) parts.push(`• 다빈도 차종: ${topType}`);
    if (topStatus) parts.push(`• 우세 상태: ${topStatus}`);

    setTitle(newTitle);
    setSummary(parts.join("\n"));

    const notable = aggregates.dispatched.slice(0, 5).map((v) => {
      const where = v.dispatchPlace ? ` @ ${v.dispatchPlace}` : "";
      return `- [${v.callname}] ${v.type} · ${v.sido}/${v.station}${where} · 상태:${v.status}`;
    });
    const newMemo =
      (memo.trim() ? memo + "\n\n" : "") +
      `점검 메모:\n` +
      (notable.length ? notable.join("\n") : "- 현재 출동 차량 없음");

    setMemo(newMemo);
    setIsAIGenerating(false);
  };

  /** 액션: 인쇄/CSV/임시저장 */
  const handlePrint = () => window.print();
  const handleExportCSV = () => {
    const header = [
      "id", "sido", "station", "type", "callname",
      "capacity", "personnel", "avl", "pslte", "status",
      "dispatchPlace", "contact", "content", "lat", "lng", "rally"
    ];
    const rows = filteredVehicles.map((v) => [
      v.id, v.sido, v.station, v.type, v.callname,
      v.capacity, v.personnel, v.avl, v.pslte, v.status,
      v.dispatchPlace ?? "", v.contact ?? "", v.content ?? "", v.lat ?? "", v.lng ?? "", v.rally ? "Y" : "N"
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (title || "vehicle-report") + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleTempSave = () => {
    const payload = {
      topic, periodStart, periodEnd, filterSido, filterType, filterStatus,
      title, summary, memo, savedAt: new Date().toISOString(),
    };
    localStorage.setItem("vehicle_report_draft", JSON.stringify(payload));
    alert("임시저장 완료!");
  };

  const PreviewSection: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:shadow-none">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </section>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] w-full gap-4 p-4 text-gray-800 min-h-0">

      {/* 좌측 패널 */}
      <aside className="w-[260px] shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm
                  flex flex-col overflow-y-auto">
        {/* STEP 1 */}
        <div className="border-b p-4">
          <p className="mb-2 text-sm font-semibold">STEP 1. 보고서 주제</p>
          <div className="grid grid-cols-2 gap-2">
            {(["전체 통계", "지역별 통계", "차종별 통계", "상태별 통계", "출동 목록"] as Topic[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTopic(t); setStep(2); }}
                className={`rounded-md border px-2 py-1 text-xs hover:bg-gray-50 ${topic === t ? "border-red-500 text-red-600" : "border-gray-200"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* STEP 2 */}
        <div className="border-b p-4">
          <p className="mb-3 text-sm font-semibold">STEP 2. 필터/항목 선택</p>
          <Labeled label="기간 (시작일)">
            <input type="date" value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
          </Labeled>
          <Labeled label="기간 (종료일)">
            <input type="date" value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
          </Labeled>
          <Labeled label="지역 (시/도)">
            <select value={filterSido} onChange={(e) => setFilterSido(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
              <option value="">전체</option>
              {sidos.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Labeled>
          <Labeled label="차종">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
              <option value="">전체</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Labeled>
          <Labeled label="상태">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as VehicleStatus | "")}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
              <option value="">전체</option>
              {(["대기", "활동", "대기중", "출동중", "복귀", "철수"] as VehicleStatus[]).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Labeled>

          <button onClick={() => setStep(3)}
            className="mt-2 w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            작성하기
          </button>

          <div className="mt-4">
            <p className="mb-1 text-xs text-gray-600">임시저장</p>
            <input placeholder="메모 제목(선택)"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
          </div>
        </div>

        {/* STEP 3: 사용자 입력 + AI 작성 */}
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">사용자 입력</p>
            <button
              onClick={generateWithAI}
              disabled={isAIGenerating}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${isAIGenerating ? "bg-gray-200 text-gray-500" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
              title="필터/집계를 기반으로 제목·요약·메모 자동 작성"
            >
              {isAIGenerating ? "AI 작성 중..." : "AI로 자동 작성"}
            </button>
          </div>

          <Labeled label="보고서 제목">
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 9월 1주차 차량 현황 보고"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
          </Labeled>

          <Labeled label="요약 설명">
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)}
              rows={3} placeholder="AI가 채운 내용을 자유롭게 수정하세요"
              className="w-full resize-none rounded border border-gray-300 px-2 py-1 text-sm" />
          </Labeled>

          <Labeled label="비고/메모">
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)}
              rows={3} placeholder="특이사항, 참고사항 등 자유 입력"
              className="w-full resize-none rounded border border-gray-300 px-2 py-1 text-sm" />
          </Labeled>

          <div className="mt-2 flex gap-2">
            <button onClick={handleTempSave}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
              임시저장
            </button>
            <button onClick={() => setStep(4)}
              className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              출력/저장 단계로
            </button>
          </div>
        </div>
      </aside>

      {/* 우측 본문 */}
      <main className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {/* 상단 탭 & 액션 */}
        <div className="flex items-center justify-between gap-2 border-b bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            {([1, 2, 3, 4] as TabStep[]).map((n) => {
              const labels: Record<TabStep, string> = {
                1: "1.주제", 2: "2.설정", 3: "3.미리보기", 4: "4.출력/저장",
              };
              const active = step === n;
              return (
                <button key={n} onClick={() => setStep(n)}
                  className={`rounded-full px-3 py-1 text-sm ${active ? "bg-gray-900 text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}>
                  {labels[n]}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50">
              인쇄하기/PDF
            </button>
            <button onClick={handleExportCSV}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50">
              EXCEL 다운로드
            </button>
            <button onClick={handleTempSave}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50">
              임시저장
            </button>
          </div>
        </div>

        {/* 미리보기 */}
        <div className="h-full overflow-auto p-4">
          <div id="print-area" className="mx-auto w-full max-w-[1100px] space-y-4">
            <div className="rounded-xl bg-white p-4 shadow-sm print:shadow-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">동원차량 관리 프로그램 – 현황 보고서</h2>
                  <p className="text-xs text-gray-500">
                    {new Date().toLocaleString()} • {topic}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gray-200 ring-2 ring-gray-300" />
              </div>
            </div>

            <PreviewSection title="사용자 작성 정보">
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-500">보고서 제목</p>
                  <p className="font-medium">{title || "제목 미입력"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">기간</p>
                  <p className="font-medium">
                    {periodStart || "—"} ~ {periodEnd || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">필터</p>
                  <p className="font-medium">
                    {filterSido ? `시도:${filterSido} ` : ""}
                    {filterType ? `차종:${filterType} ` : ""}
                    {filterStatus ? `상태:${filterStatus}` : ""}
                    {!filterSido && !filterType && !filterStatus ? "없음" : ""}
                  </p>
                </div>
              </div>
              {summary && (
                <div className="mt-3">
                  <p className="mb-1 text-xs text-gray-500">요약</p>
                  <p className="whitespace-pre-wrap text-sm">{summary}</p>
                </div>
              )}
              {memo && (
                <div className="mt-3">
                  <p className="mb-1 text-xs text-gray-500">비고/메모</p>
                  <p className="whitespace-pre-wrap text-sm">{memo}</p>
                </div>
              )}
            </PreviewSection>

            <PreviewSection title="집계 요약">
              <div className="grid gap-3 sm:grid-cols-4">
                <KPI label="총 차량 수" value={`${aggregates.totalVehicles}대`} />
                <KPI label="총 인원 수" value={`${aggregates.totalPersonnel}명`} />
                <KPI label="출동(활동/출동중)" value={`${aggregates.dispatched.length}대`} />
                <KPI label="선택 주제" value={topic} />
              </div>
            </PreviewSection>

            <PreviewSection title="지역별(시/도) 차량 수">
              <SimpleTable
                headers={["시/도", "대수"]}
                rows={Object.entries(aggregates.bySido).map(([k, arr]) => [k, `${arr.length}`])}
              />
            </PreviewSection>

            <PreviewSection title="차종별 차량 수">
              <SimpleTable
                headers={["차종", "대수"]}
                rows={Object.entries(aggregates.byType).map(([k, arr]) => [k, `${arr.length}`])}
              />
            </PreviewSection>

            <PreviewSection title="상태별 차량 수">
              <SimpleTable
                headers={["상태", "대수"]}
                rows={Object.entries(aggregates.byStatus).map(([k, arr]) => [k, `${arr.length}`])}
              />
            </PreviewSection>

            <PreviewSection title="출동(활동·출동중) 목록">
              <SimpleTable
                headers={["호출명", "시/도", "소방서", "차종", "상태", "자원집결지", "연락처", "지시/특이"]}
                rows={aggregates.dispatched.map((v) => [
                  v.callname,
                  v.sido,
                  v.station,
                  v.type,
                  v.status,
                  v.dispatchPlace ?? "-",
                  v.contact ?? "-",
                  v.content ?? "-",
                ])}
              />
            </PreviewSection>
          </div>
        </div>
      </main>
    </div>
  );
}

/** 공용 소품들 */
function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center shadow-sm print:shadow-none">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
function SimpleTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="bg-gray-100">
            {headers.map((h) => (
              <th key={h} className="whitespace-nowrap border-b px-3 py-2 text-left font-semibold text-gray-700">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-center text-gray-500" colSpan={headers.length}>데이터가 없습니다.</td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="even:bg-gray-50">
                {r.map((c, j) => (
                  <td key={j} className="whitespace-nowrap border-t px-3 py-2 text-gray-800">{c}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs text-gray-600">{label}</p>
      {children}
    </div>
  );
}
