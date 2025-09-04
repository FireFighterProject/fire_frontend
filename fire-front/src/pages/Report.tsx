import React, { useMemo, useState } from "react";

/** --------------------------- 샘플 타입 & 데이터 --------------------------- */
type Vehicle = {
  id: string;
  sido: string;
  station: string;
  type: string;
  callname: string;
  personnel: number;
};

type Activity = {
  id: string;
  vehicleId: string;
  command: string;
  place: string;
  startAt: string; // ISO
  endAt: string;   // ISO
  status: "대기" | "활동" | "복귀";
};

const SAMPLE_VEHICLES: Vehicle[] = [
  { id: "v1", sido: "경북", station: "포항소방서", type: "펌프차", callname: "포항119-1", personnel: 4 },
  { id: "v2", sido: "경북", station: "구미소방서", type: "구조차", callname: "구미119-2", personnel: 5 },
  { id: "v3", sido: "대구", station: "달서소방서", type: "구급차", callname: "달서119-1", personnel: 3 },
  { id: "v4", sido: "대구", station: "수성소방서", type: "펌프차", callname: "수성119-3", personnel: 4 },
];

const SAMPLE_ACTIVITIES: Activity[] = [
  { id: "a1", vehicleId: "v1", command: "화재 진압", place: "포항시 남구 대이동", startAt: "2025-08-30T09:10:00", endAt: "2025-08-30T10:05:00", status: "복귀" },
  { id: "a2", vehicleId: "v2", command: "구조 출동", place: "구미시 선산읍", startAt: "2025-08-30T11:20:00", endAt: "2025-08-30T12:10:00", status: "복귀" },
  { id: "a3", vehicleId: "v3", command: "구급 이송", place: "대구시 달서구 용산동", startAt: "2025-08-31T14:30:00", endAt: "2025-08-31T15:05:00", status: "복귀" },
  { id: "a4", vehicleId: "v4", command: "화재 진압", place: "대구시 수성구 만촌동", startAt: "2025-09-01T08:05:00", endAt: "2025-09-01T09:00:00", status: "복귀" },
];

/** --------------------------- 유틸 --------------------------- */
const toMins = (ms: number) => Math.round(ms / 60000);
const diffMins = (a: string, b: string) => toMins(new Date(b).getTime() - new Date(a).getTime());
function groupBy<T, K extends string | number>(arr: T[], keyFn: (x: T) => K): Record<K, T[]> {
  return arr.reduce((m, x) => {
    const k = keyFn(x);
    (m[k] ??= []).push(x);
    return m;
  }, {} as Record<K, T[]>);
}
const unique = <T,>(arr: T[]) => Array.from(new Set(arr));

/** --------------------------- 컴포넌트 --------------------------- */
type Topic =
  | "전체 통계"
  | "지역별 통계"
  | "차종별 통계"
  | "출동 명령별"
  | "활동 시간 분석";

type TabStep = 1 | 2 | 3 | 4;

export default function ReportPage() {
  /** 탭 & 폼 상태 */
  const [step, setStep] = useState<TabStep>(1);
  const [topic, setTopic] = useState<Topic>("전체 통계");

  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");

  const sidos = useMemo(() => unique(SAMPLE_VEHICLES.map((v) => v.sido)), []);
  const types = useMemo(() => unique(SAMPLE_VEHICLES.map((v) => v.type)), []);

  const [filterSido, setFilterSido] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"" | Activity["status"]>("");

  /** 사용자 입력 가능한 필드 (AI가 채워주고, 사용자가 수정 가능) */
  const [title, setTitle] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [memo, setMemo] = useState<string>("");

  /** AI 진행 상태 */
  const [isAIGenerating, setIsAIGenerating] = useState<boolean>(false);

  /** 필터링된 활동 */
  const filteredActivities = useMemo(() => {
    return SAMPLE_ACTIVITIES.filter((a) => {
      const v = SAMPLE_VEHICLES.find((vv) => vv.id === a.vehicleId);
      if (!v) return false;
      if (filterSido && v.sido !== filterSido) return false;
      if (filterType && v.type !== filterType) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      if (periodStart && new Date(a.startAt) < new Date(periodStart)) return false;
      if (periodEnd && new Date(a.endAt) > new Date(periodEnd)) return false;
      return true;
    });
  }, [filterSido, filterType, filterStatus, periodStart, periodEnd]);

  /** 집계 */
  const aggregates = useMemo(() => {
    const bySido = groupBy(filteredActivities, (a) => {
      const v = SAMPLE_VEHICLES.find((x) => x.id === a.vehicleId)!;
      return v.sido;
    });
    const byType = groupBy(filteredActivities, (a) => {
      const v = SAMPLE_VEHICLES.find((x) => x.id === a.vehicleId)!;
      return v.type;
    });
    const byCommand = groupBy(filteredActivities, (a) => a.command);

    const timeMins = filteredActivities.map((a) => diffMins(a.startAt, a.endAt));
    const totalMins = timeMins.reduce((s, v) => s + v, 0);
    const avgMins = timeMins.length ? Math.round(totalMins / timeMins.length) : 0;

    return { totalCount: filteredActivities.length, bySido, byType, byCommand, totalMins, avgMins };
  }, [filteredActivities]);

  /** --------------------------- AI 작성 로직 ---------------------------
   * 기본은 로컬 규칙 기반 생성(오프라인 동작).
   * 실제 OpenAI/서버 연동 시 아래 fetch를 주석 해제하고 사용.
   */
  const generateWithAI = async () => {
    setIsAIGenerating(true);

    // ★ 서버 연동 샘플 (원하면 활성화)
    // try {
    //   const res = await fetch("/api/ai/report", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       topic,
    //       periodStart,
    //       periodEnd,
    //       filters: { filterSido, filterType, filterStatus },
    //       aggregates,
    //       activities: filteredActivities,
    //     }),
    //   });
    //   const data = await res.json();
    //   setTitle(data.title);
    //   setSummary(data.summary);
    //   setMemo(data.memo);
    //   return;
    // } catch (e) {
    //   console.warn("AI API fallback to local generator.", e);
    // }

    // ▶ 로컬 규칙 기반 자동 작성 (fallback)
    const dateRange =
      (periodStart || periodEnd) ? `${periodStart || "—"} ~ ${periodEnd || "—"}` : "최근 기간";
    const parts: string[] = [];
    const topSido = Object.entries(aggregates.bySido)
      .sort((a, b) => b[1].length - a[1].length)[0]?.[0];
    const topType = Object.entries(aggregates.byType)
      .sort((a, b) => b[1].length - a[1].length)[0]?.[0];
    const topCmd = Object.entries(aggregates.byCommand)
      .sort((a, b) => b[1].length - a[1].length)[0]?.[0];

    const newTitle =
      title.trim() ||
      `${dateRange} ${filterSido ? `${filterSido} ` : ""}${topic} 보고`;

    parts.push(
      `• 기간: ${dateRange}`,
      `• 총 출동 ${aggregates.totalCount}건, 총 활동 ${aggregates.totalMins}분(평균 ${aggregates.avgMins}분)`
    );
    if (filterSido || filterType || filterStatus) {
      parts.push(`• 필터: ${filterSido || "전체"} / ${filterType || "전체"} / ${filterStatus || "전체"}`);
    }
    if (topSido) parts.push(`• 활동 집중 지역: ${topSido}`);
    if (topType) parts.push(`• 다빈도 차종: ${topType}`);
    if (topCmd) parts.push(`• 주요 출동 명령: ${topCmd}`);
    const newSummary = parts.join("\n");

    const notable = filteredActivities.slice(0, 3).map((a) => {
      const v = SAMPLE_VEHICLES.find((x) => x.id === a.vehicleId)!;
      return `- [${v.callname}] ${a.command} · ${a.place} (${a.startAt.replace("T", " ")} ~ ${a.endAt.replace("T", " ")}, ${diffMins(a.startAt, a.endAt)}분)`;
    });
    const newMemo =
      (memo.trim() ? memo + "\n\n" : "") +
      `점검 메모:\n` +
      (notable.length ? notable.join("\n") : "- 특이사항 없음");

    // 필드 채우기 (사용자가 이후 자유롭게 수정 가능)
    setTitle(newTitle);
    setSummary(newSummary);
    setMemo(newMemo);

    setIsAIGenerating(false);
  };

  /** 액션: 인쇄/CSV/임시저장 */
  const handlePrint = () => window.print();
  const handleExportCSV = () => {
    const header = ["vehicle", "sido", "type", "command", "place", "startAt", "endAt", "status"];
    const rows = filteredActivities.map((a) => {
      const v = SAMPLE_VEHICLES.find((x) => x.id === a.vehicleId)!;
      return [v.callname, v.sido, v.type, a.command, a.place, a.startAt, a.endAt, a.status];
    });
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (title || "report") + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleTempSave = () => {
    const payload = {
      topic, periodStart, periodEnd, filterSido, filterType, filterStatus,
      title, summary, memo, savedAt: new Date().toISOString(),
    };
    localStorage.setItem("report_draft", JSON.stringify(payload));
    alert("임시저장 완료!");
  };

  const PreviewSection: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:shadow-none">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </section>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] w-full gap-4 p-4 text-gray-800">
      {/* 좌측 패널 */}
      <aside className="w-[260px] shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* STEP 1 */}
        <div className="border-b p-4">
          <p className="mb-2 text-sm font-semibold">STEP 1. 보고서 주제</p>
          <div className="grid grid-cols-2 gap-2">
            {(["전체 통계", "지역별 통계", "차종별 통계", "출동 명령별", "활동 시간 분석"] as Topic[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTopic(t); setStep(2); }}
                className={`rounded-md border px-2 py-1 text-xs hover:bg-gray-50 ${topic === t ? "border-red-500 text-red-600" : "border-gray-200"
                  }`}
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
              <option value="">드롭다운</option>
              {sidos.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Labeled>
          <Labeled label="차종">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
              <option value="">드롭다운</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Labeled>
          <Labeled label="상태">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
              <option value="">드롭다운</option>
              <option value="대기">대기</option>
              <option value="활동">활동</option>
              <option value="복귀">복귀</option>
            </select>
          </Labeled>

          <button onClick={() => setStep(3)}
            className="mt-2 w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            작성하기
          </button>

          <div className="mt-4">
            <p className="mb-1 text-xs text-gray-600">임시저장</p>
            <input placeholder="오름차순"
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
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${isAIGenerating
                  ? "bg-gray-200 text-gray-500"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              title="필터/집계를 기반으로 제목·요약·메모 자동 작성"
            >
              {isAIGenerating ? "AI 작성 중..." : "AI로 자동 작성"}
            </button>
          </div>

          <Labeled label="보고서 제목">
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 9월 1주차 지역별 활동 보고"
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
                  <h2 className="text-lg font-bold">동원차량 관리 프로그램 – 보고서</h2>
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
                <KPI label="총 출동 건수" value={`${aggregates.totalCount}건`} />
                <KPI label="총 활동 시간" value={`${aggregates.totalMins}분`} />
                <KPI label="평균 활동 시간" value={`${aggregates.avgMins}분`} />
                <KPI label="선택 주제" value={topic} />
              </div>
            </PreviewSection>

            <PreviewSection title="지역별(시/도) 출동 건수">
              <SimpleTable
                headers={["시/도", "건수"]}
                rows={Object.entries(aggregates.bySido).map(([k, arr]) => [k, `${arr.length}`])}
              />
            </PreviewSection>

            <PreviewSection title="차종별 출동 건수">
              <SimpleTable
                headers={["차종", "건수"]}
                rows={Object.entries(aggregates.byType).map(([k, arr]) => [k, `${arr.length}`])}
              />
            </PreviewSection>

            <PreviewSection title="출동 명령별 통계">
              <SimpleTable
                headers={["출동 명령", "건수"]}
                rows={Object.entries(aggregates.byCommand).map(([k, arr]) => [k, `${arr.length}`])}
              />
            </PreviewSection>

            <PreviewSection title="주요 출동 목록">
              <SimpleTable
                headers={["차량", "시/도", "차종", "명령", "장소", "시작", "종료", "소요(분)", "상태"]}
                rows={filteredActivities.map((a) => {
                  const v = SAMPLE_VEHICLES.find((x) => x.id === a.vehicleId)!;
                  return [
                    v.callname,
                    v.sido,
                    v.type,
                    a.command,
                    a.place,
                    a.startAt.replace("T", " "),
                    a.endAt.replace("T", " "),
                    `${diffMins(a.startAt, a.endAt)}`,
                    a.status,
                  ];
                })}
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
