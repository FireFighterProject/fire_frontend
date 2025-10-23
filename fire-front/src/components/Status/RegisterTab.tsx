// src/pages/Status.tsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

/** =========================
 *  백엔드 API 타입(단건)
 *  ========================= */
type ApiVehicle = {
    stationId: number;
    callSign: string;
    typeName: string;
    capacity: number;
    personnel: number;
    avlNumber: string;
    psLteNumber: string;
    status: number;     // 코드 값 (예: 대기=0)
    rallyPoint: number; // 0/1
    sido: string;       // 시도
};

/** 소방서 목록 API 응답 타입 */
type FireStation = {
    id: number;
    sido: string;
    name: string;
    address: string;
};

/** UI 입력 폼 상태 (백엔드 스키마와 일치) */
type FormState = ApiVehicle;

/** 엑셀 원본 컬럼(문자열) */
type ExcelRow = {
    시도?: string;
    소방서?: string;
    소방서ID?: string | number;
    차종?: string;
    호출명?: string;
    용량?: string | number;
    인원?: string | number;
    "AVL 단말기번호"?: string;
    "PS-LTE 번호"?: string;
};

/** 엑셀 미리보기용 행(표시 전용) */
type ExcelPreviewRow = {
    id: string;
    sido: string;
    station: string;
    stationId: number;
    typeName: string;
    callSign: string;
    capacity: number;
    personnel: number;
    avlNumber: string;
    psLteNumber: string;
};

const api = axios.create({
    baseURL: "/api",
    headers: { "Content-Type": "application/json" },
});

/** 숫자 변환 헬퍼 */
const toNum = (v: string | number | undefined | null, fallback = 0) => {
    if (v === undefined || v === null || v === "") return fallback;
    if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
    const cleaned = String(v).replace(/,/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
};

/** 상태코드 기본값(대기=0) — 백엔드 정의에 맞게 조정 가능 */
const DEFAULT_STATUS_CODE = 0;

/** 시도 프리셋(17개 시·도) */
const SIDO_OPTIONS = [
    "서울특별시",
    "부산광역시",
    "대구광역시",
    "인천광역시",
    "광주광역시",
    "대전광역시",
    "울산광역시",
    "세종특별자치시",
    "경기도",
    "강원도",
    "충청북도",
    "충청남도",
    "전라북도",
    "전라남도",
    "경상북도",
    "경상남도",
    "제주특별자치도"
];

function RegisterTab() {
    // ---------------- UI 상태 ----------------
    const [form, setForm] = useState<FormState>({
        stationId: 0,
        callSign: "",
        typeName: "",
        capacity: 0,
        personnel: 0,
        avlNumber: "",
        psLteNumber: "",
        status: DEFAULT_STATUS_CODE,
        rallyPoint: 0,
        sido: "", // 시도는 셀렉트로 선택
    });

    const [excelRows, setExcelRows] = useState<ExcelPreviewRow[]>([]);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // 소방서 목록 상태
    const [stations, setStations] = useState<FireStation[]>([]);
    const [stationLoading, setStationLoading] = useState(false);

    const onChange = <K extends keyof FormState>(k: K, v: FormState[K]) =>
        setForm((p) => ({ ...p, [k]: v }));

    // --------------- 소방서 목록 조회 ---------------
    const fetchStations = async (sido?: string) => {
        try {
            setStationLoading(true);
            const res = await api.get<FireStation[]>("/fire-stations", {
                params: { sido: sido && sido.trim() ? sido.trim() : undefined },
            });
            setStations(res.data ?? []);
        } catch (e) {
            console.error(e);
            setStations([]);
        } finally {
            setStationLoading(false);
        }
    };

    // 시도 변경 시 자동 조회 + stationId 초기화
    useEffect(() => {
        if (form.sido) fetchStations(form.sido);
        setForm((p) => ({ ...p, stationId: 0 }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.sido]);

    // --------------- 단건 등록 ---------------
    const handleRegister = async () => {
        if (!form.sido) {
            alert("시도(sido)를 선택해주세요.");
            return;
        }
        if (!form.stationId || !form.callSign || !form.typeName) {
            alert("소방서/차종(typeName)/호출명(callSign)을 입력(선택)해주세요.");
            return;
        }
        try {
            setLoading(true);
            await api.post("/vehicles", {
                ...form,
                capacity: toNum(form.capacity, 0),
                personnel: toNum(form.personnel, 0),
                status: toNum(form.status, DEFAULT_STATUS_CODE),
                rallyPoint: toNum(form.rallyPoint, 0),
            } satisfies ApiVehicle);

            alert("차량이 등록되었습니다.");
            setForm({
                stationId: 0,
                callSign: "",
                typeName: "",
                capacity: 0,
                personnel: 0,
                avlNumber: "",
                psLteNumber: "",
                status: DEFAULT_STATUS_CODE,
                rallyPoint: 0,
                sido: "",
            });
            setStations([]);
        } catch (e: any) {
            console.error(e);
            alert(`등록 실패: ${e?.response?.data?.message ?? e.message ?? "알 수 없는 오류"}`);
        } finally {
            setLoading(false);
        }
    };

    // ----------- 엑셀 선택/파싱 -----------
    const handlePickExcel = () => fileInputRef.current?.click();

    const handleExcelFile = async (file: File) => {
        try {
            const XLSX: any =
                (await import("xlsx")).default ?? (await import("xlsx"));
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: "array" });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as ExcelRow[];

            const mapped: ExcelPreviewRow[] = json.map((r, i) => {
                const stationId = toNum(r.소방서ID as any, 0);
                if (!stationId) {
                    console.warn(`[Excel] ${i + 1}행: stationId(소방서ID) 없음 → 0으로 설정됨`);
                }
                return {
                    id: `${file.name}-${i}`,
                    sido: r.시도 ?? "",
                    station: r.소방서 ?? "",
                    stationId,
                    typeName: r.차종 ?? "",
                    callSign: r.호출명 ?? "",
                    capacity: toNum(r.용량, 0),
                    personnel: toNum(r.인원, 0),
                    avlNumber: r["AVL 단말기번호"] ?? "",
                    psLteNumber: r["PS-LTE 번호"] ?? "",
                };
            });

            setExcelRows(mapped);
        } catch (e) {
            console.error(e);
            // xlsx 실패 시 파일명만 보여주기
            setExcelRows([
                {
                    id: file.name,
                    sido: "",
                    station: `파일 선택: ${file.name}`,
                    stationId: 0,
                    typeName: "",
                    callSign: "",
                    capacity: 0,
                    personnel: 0,
                    avlNumber: "",
                    psLteNumber: "",
                },
            ]);
        }
    };

    // ----------- 엑셀 → 서버 등록 -----------
    const handleBulkRegister = async () => {
        if (excelRows.length === 0) {
            alert("엑셀 데이터가 없습니다.");
            return;
        }
        const invalid = excelRows.find(
            (r) => !r.stationId || !r.typeName || !r.callSign
        );
        if (invalid) {
            alert("엑셀 행 중 stationId / 차종(typeName) / 호출명(callSign) 누락이 있습니다.");
            return;
        }

        try {
            setLoading(true);
            await Promise.all(
                excelRows.map((r) =>
                    api.post("/vehicles", {
                        stationId: r.stationId,
                        callSign: r.callSign,
                        typeName: r.typeName,
                        capacity: toNum(r.capacity, 0),
                        personnel: toNum(r.personnel, 0),
                        avlNumber: r.avlNumber,
                        psLteNumber: r.psLteNumber,
                        status: DEFAULT_STATUS_CODE,
                        rallyPoint: 0,
                        sido: r.sido || "",
                    } as ApiVehicle)
                )
            );
            alert(`엑셀 ${excelRows.length}건 등록 완료`);
            setExcelRows([]);
        } catch (e: any) {
            console.error(e);
            alert(`일괄 등록 실패: ${e?.response?.data?.message ?? e.message ?? "알 수 없는 오류"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* 신규등록 카드 */}
            <section className="rounded-md border border-gray-300">
                <header className="px-5 py-3 border-b border-gray-300 font-semibold">
                    신규등록
                </header>

                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1) 시도 선택 */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[13px] text-gray-700">시도 (sido)</span>
                            <select
                                className="h-9 rounded border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.sido}
                                onChange={(e) => onChange("sido", e.target.value)}
                            >
                                <option value="">시도를 선택하세요</option>
                                {SIDO_OPTIONS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500">시도를 먼저 선택하면 해당 지역의 소방서 목록을 불러옵니다.</p>
                        </div>

                        {/* 2) 소방서 선택 (stationId 자동 세팅) */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[13px] text-gray-700">소방서 (station)</span>
                            <select
                                className="h-9 rounded border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={String(form.stationId)}
                                onChange={(e) => onChange("stationId", Number(e.target.value) || 0)}
                                disabled={!form.sido || stationLoading || stations.length === 0}
                            >
                                <option value="0">
                                    {!form.sido
                                        ? "시도를 먼저 선택하세요"
                                        : stationLoading
                                            ? "불러오는 중..."
                                            : stations.length
                                                ? "소방서를 선택하세요"
                                                : "해당 시도의 소방서 목록이 없습니다"}
                                </option>
                                {stations.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {`${s.name} (ID: ${s.id})`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <Input
                            label="차종 (typeName)"
                            value={form.typeName}
                            onChange={(v) => onChange("typeName", v)}
                        />
                        <Input
                            label="호출명 (callSign)"
                            value={form.callSign}
                            onChange={(v) => onChange("callSign", v)}
                        />
                        <Input
                            label="용량 (capacity)"
                            type="number"
                            value={String(form.capacity)}
                            onChange={(v) => onChange("capacity", toNum(v, 0))}
                        />
                        <Input
                            label="인원 (personnel)"
                            type="number"
                            value={String(form.personnel)}
                            onChange={(v) => onChange("personnel", toNum(v, 0))}
                        />
                        <Input
                            label="AVL 단말기 번호 (avlNumber)"
                            value={form.avlNumber}
                            onChange={(v) => onChange("avlNumber", v)}
                        />
                        <Input
                            label="PS-LTE 번호 (psLteNumber)"
                            value={form.psLteNumber}
                            onChange={(v) => onChange("psLteNumber", v)}
                        />
                        <Input
                            label="상태 코드 (status)"
                            type="number"
                            value={String(form.status)}
                            onChange={(v) => onChange("status", toNum(v, DEFAULT_STATUS_CODE))}
                        />
                        <Input
                            label="집결 여부 (rallyPoint: 0/1)"
                            type="number"
                            value={String(form.rallyPoint)}
                            onChange={(v) => onChange("rallyPoint", toNum(v, 0))}
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={handleRegister}
                            disabled={loading}
                            className="px-4 h-9 rounded-md bg-[#e1412b] text-white text-sm font-semibold hover:brightness-95 disabled:opacity-60"
                        >
                            {loading ? "등록 중..." : "차량등록"}
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleExcelFile(f);
                            }}
                            className="hidden"
                        />
                    </div>
                </div>
            </section>

            {/* 선택된 엑셀 파일 카드 */}
            <section className="rounded-md border border-gray-300">
                <header className="px-5 py-3 border-b border-gray-300 font-semibold">
                    선택된 엑셀 파일
                </header>

                <div className="p-5 space-y-3">
                    <div className="flex gap-3">
                        <button
                            onClick={handlePickExcel}
                            className="px-4 h-9 rounded-md bg-[#ff6b35] text-white text-sm font-semibold hover:brightness-95"
                        >
                            엑셀 파일 선택
                        </button>
                        <button
                            onClick={handleBulkRegister}
                            disabled={loading || excelRows.length === 0}
                            className="px-4 h-9 rounded-md bg-[#e1412b] text-white text-sm font-semibold hover:brightness-95 disabled:opacity-60"
                        >
                            {loading ? "등록 중..." : "엑셀 데이터로 차량등록"}
                        </button>
                    </div>

                    <div className="overflow-auto border border-gray-300 rounded">
                        <table className="min-w-[920px] w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
                                    <th>시도</th>
                                    <th>소방서</th>
                                    <th>소방서ID</th>
                                    <th>차종(typeName)</th>
                                    <th>호출명(callSign)</th>
                                    <th>용량</th>
                                    <th>인원</th>
                                    <th>AVL 단말기번호</th>
                                    <th>PS-LTE 번호</th>
                                </tr>
                            </thead>
                            <tbody>
                                {excelRows.length === 0 ? (
                                    <tr>
                                        <td className="px-3 py-6 text-center text-gray-500" colSpan={9}>
                                            선택된 파일이 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    excelRows.map((r) => (
                                        <tr key={r.id} className="even:bg-gray-50/40">
                                            <Td>{r.sido}</Td>
                                            <Td>{r.station}</Td>
                                            <Td>{r.stationId || <span className="text-red-500">0(미지정)</span>}</Td>
                                            <Td>{r.typeName}</Td>
                                            <Td>{r.callSign}</Td>
                                            <Td>{r.capacity}</Td>
                                            <Td>{r.personnel}</Td>
                                            <Td>{r.avlNumber}</Td>
                                            <Td>{r.psLteNumber}</Td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
}

/* ------------------------------- UI Helpers ------------------------------ */

function Input({
    label,
    value,
    onChange,
    type = "text",
}: {
    label: string;
    value: string;
    type?: "text" | "number";
    onChange: (v: string) => void;
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[13px] text-gray-700">{label}</span>
            <input
                value={value}
                type={type}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 rounded border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </label>
    );
}

function Td({ children }: { children: React.ReactNode }) {
    return <td className="px-3 py-2 border-t border-gray-300">{children}</td>;
}

export default RegisterTab;
