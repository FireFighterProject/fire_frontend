import React, { useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type { VehicleStatus } from "../types/global";

/* 유틸 */
const unique = <T,>(arr: T[]) => Array.from(new Set(arr));

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

/* 타입 */
type Topic =
  | "전체 통계"
  | "지역별 통계"
  | "차종별 통계"
  | "상태별 통계"
  | "출동 목록";

/* 메인 컴포넌트 */
export default function ReportPage() {
  const vehicles = useSelector((s: RootState) => s.vehicle.vehicles);

  /* 상태 */
  const [topic, setTopic] = useState<Topic>("전체 통계");

  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const [filterSido, setFilterSido] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState<VehicleStatus | "">("");

  const sidos = useMemo(() => unique(vehicles.map((v) => v.sido)), [vehicles]);
  const types = useMemo(() => unique(vehicles.map((v) => v.type)), [vehicles]);

  /* 보고서 내용 */
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [memoText, setMemoText] = useState("");

  const [loadingAI, setLoadingAI] = useState(false);

  /* 임시저장 불러오기 */
  useEffect(() => {
    const saved = localStorage.getItem("report_draft");
    if (!saved) return;

    const d = JSON.parse(saved);
    setTopic(d.topic ?? "전체 통계");
    setPeriodStart(d.periodStart ?? "");
    setPeriodEnd(d.periodEnd ?? "");
    setFilterSido(d.filterSido ?? "");
    setFilterType(d.filterType ?? "");
    setFilterStatus(d.filterStatus ?? "");
    setTitle(d.title ?? "");
    setSummary(d.summary ?? "");
    setMemoText(d.memo ?? "");
  }, []);

  /* 필터링 */
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (filterSido && v.sido !== filterSido) return false;
      if (filterType && v.type !== filterType) return false;
      if (filterStatus && v.status !== filterStatus) return false;
      return true;
    });
  }, [vehicles, filterSido, filterType, filterStatus]);

  /* 집계 */
  const aggregates = useMemo(() => {
    const bySido = groupBy(filteredVehicles, (v) => v.sido);
    const byType = groupBy(filteredVehicles, (v) => v.type);
    const byStatus = groupBy(filteredVehicles, (v) => v.status);

    const dispatched = filteredVehicles.filter((v) =>
      ["출동중", "활동"].includes(v.status)
    );

    return {
      totalVehicles: filteredVehicles.length,
      totalPersonnel: filteredVehicles.reduce(
        (s, v) => s + (Number(v.personnel) || 0),
        0
      ),
      bySido,
      byType,
      byStatus,
      dispatched,
    };
  }, [filteredVehicles]);

  /* AI 자동 생성 */
  const generateAI = () => {
    setLoadingAI(true);

    const range =
      periodStart || periodEnd
        ? `${periodStart || "—"} ~ ${periodEnd || "—"}`
        : "현 시점";

    const newTitle = title || `${range} ${topic} 보고`;
    setTitle(newTitle);

    const parts = [
      `• 기간: ${range}`,
      `• 총 차량: ${aggregates.totalVehicles}대`,
      `• 총 인원: ${aggregates.totalPersonnel}명`,
      `• 출동중/활동 차량: ${aggregates.dispatched.length}대`,
    ];

    if (filterSido || filterType || filterStatus) {
      parts.push(
        `• 필터: 시도=${filterSido || "전체"}, 차종=${filterType || "전체"}, 상태=${filterStatus || "전체"
        }`
      );
    }

    setSummary(parts.join("\n"));

    const memoContent =
      aggregates.dispatched.length === 0
        ? "- 현재 출동 차량 없음"
        : aggregates.dispatched
          .slice(0, 5)
          .map(
            (v) =>
              `- [${v.callname}] ${v.sido}/${v.station} (${v.type}) 상태:${v.status}`
          )
          .join("\n");

    setMemoText(`점검 메모:\n${memoContent}`);

    setLoadingAI(false);
  };

  /* 임시저장 */
  const saveDraft = () => {
    const payload = {
      topic,
      periodStart,
      periodEnd,
      filterSido,
      filterType,
      filterStatus,
      title,
      summary,
      memo: memoText,
    };
    localStorage.setItem("report_draft", JSON.stringify(payload));
    alert("임시저장 완료!");
  };

  /* PDF 출력 */
  const printReport = () => {
    window.print();
  };

  return (
    <div className="flex h-[calc(100vh-64px)] gap-4 p-4 text-gray-800 print:bg-white">

      {/* 좌측 패널 */}
      <aside className="w-[260px] border rounded-xl bg-white shadow-sm p-4 print:hidden">
        <p className="text-sm font-semibold mb-2">STEP 1. 주제 선택</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(
            ["전체 통계", "지역별 통계", "차종별 통계", "상태별 통계", "출동 목록"] as Topic[]
          ).map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`rounded-md border px-2 py-1 text-xs ${topic === t
                  ? "border-red-500 text-red-600"
                  : "border-gray-300"
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        <p className="text-sm font-semibold mb-2">STEP 2. 필터 선택</p>

        <Labeled label="기간 시작">
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-full"
          />
        </Labeled>

        <Labeled label="기간 종료">
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-full"
          />
        </Labeled>

        <Labeled label="지역">
          <select
            value={filterSido}
            onChange={(e) => setFilterSido(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-full"
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
            className="border rounded px-2 py-1 text-sm w-full"
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
              setFilterStatus(e.target.value as VehicleStatus | "")
            }
            className="border rounded px-2 py-1 text-sm w-full"
          >
            <option value="">전체</option>
            {["대기", "활동", "출동중", "대기중", "복귀", "철수"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Labeled>

        <button
          onClick={generateAI}
          className="w-full mt-3 bg-indigo-600 text-white rounded-md py-2 text-sm"
        >
          {loadingAI ? "AI 작성 중..." : "AI 자동 작성"}
        </button>

        <button
          onClick={saveDraft}
          className="w-full mt-2 border rounded-md py-2 text-sm hover:bg-gray-50"
        >
          임시저장
        </button>

        <button
          onClick={() => window.scrollTo(0, 99999)}
          className="w-full mt-2 bg-emerald-600 text-white rounded-md py-2 text-sm"
        >
          미리보기로 이동
        </button>
      </aside>

      {/* 우측 보고서 영역 */}
      <main className="flex-1 border rounded-xl bg-gray-50 overflow-auto">

        {/* 출력할 부분 */}
        <div id="print-area" className="p-4 space-y-4">

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-lg font-bold">동원차량 현황 보고서</h2>
            <p className="text-xs text-gray-500">
              {new Date().toLocaleString()} · {topic}
            </p>
          </div>

          <PreviewSection title="사용자 작성 정보">
            <InfoRow label="보고서 제목" value={title || "제목 없음"} />

            <InfoRow
              label="기간"
              value={`${periodStart || "—"} ~ ${periodEnd || "—"}`}
            />

            <InfoRow
              label="필터"
              value={
                filterSido || filterType || filterStatus
                  ? `${filterSido || "전체"} / ${filterType || "전체"} / ${filterStatus || "전체"
                  }`
                  : "없음"
              }
            />

            {summary && (
              <InfoBlock label="요약" value={summary} />
            )}

            {memoText && (
              <InfoBlock label="메모" value={memoText} />
            )}
          </PreviewSection>

          <PreviewSection title="요약 집계">
            <div className="grid sm:grid-cols-4 gap-3">
              <KPICard label="총 차량 수" value={aggregates.totalVehicles} />
              <KPICard label="총 인원 수" value={aggregates.totalPersonnel} />
              <KPICard
                label="출동중/활동"
                value={aggregates.dispatched.length}
              />
              <KPICard label="주제" value={topic} />
            </div>
          </PreviewSection>

          <PreviewSection title="지역별 차량 수">
            <SimpleTable
              headers={["시도", "대수"]}
              rows={Object.entries(aggregates.bySido).map(([k, arr]) => [
                k,
                arr.length,
              ])}
            />
          </PreviewSection>

          <PreviewSection title="차종별 차량 수">
            <SimpleTable
              headers={["차종", "대수"]}
              rows={Object.entries(aggregates.byType).map(([k, arr]) => [
                k,
                arr.length,
              ])}
            />
          </PreviewSection>

          <PreviewSection title="상태별 차량 수">
            <SimpleTable
              headers={["상태", "대수"]}
              rows={Object.entries(aggregates.byStatus).map(([k, arr]) => [
                k,
                arr.length,
              ])}
            />
          </PreviewSection>

          <PreviewSection title="출동중/활동 차량 목록">
            <SimpleTable
              headers={[
                "호출명",
                "시도",
                "소방서",
                "차종",
                "상태",
                "집결지",
                "연락처",
                "지시사항",
              ]}
              rows={aggregates.dispatched.map((v) => [
                v.callname,
                v.sido,
                v.station,
                v.type,
                v.status,
                v.dispatchPlace || "-",
                v.contact || "-",
                v.content || "-",
              ])}
            />
          </PreviewSection>
        </div>

        {/* 출력 버튼 */}
        <div className="p-4 border-t bg-white flex gap-2 print:hidden">
          <button
            onClick={printReport}
            className="border rounded-md px-4 py-2 text-sm hover:bg-gray-50"
          >
            PDF 출력
          </button>

          <button
            onClick={saveDraft}
            className="border rounded-md px-4 py-2 text-sm hover:bg-gray-50"
          >
            임시저장
          </button>
        </div>
      </main>
    </div>
  );
}

/* ------------------------ 보조 UI ------------------------ */

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="text-xs text-gray-500">{label}</p>
      {children}
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="p-4 bg-white rounded-xl shadow-sm">
      <p className="text-sm font-semibold mb-2">{title}</p>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function KPICard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 bg-white border rounded-lg text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

/* ✔ 여기 TS 오류 해결 핵심 */
function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full bg-white text-sm">
        <thead className="bg-gray-100">
          <tr>
            {headers.map((h) => (
              <th key={h} className="border-b px-3 py-2 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="text-center py-6 text-gray-500">
                데이터 없음
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="even:bg-gray-50">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 border-t whitespace-nowrap">
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
