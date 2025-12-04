/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/Status.tsx
import React, { useEffect, useRef, useState } from "react";
import apiClient from "../../api/axios";

/* ================================================
   🔥 서버 타입
================================================ */
type ApiVehicle = {
    stationName: string;
    sido: string;
    callSign: string;
    typeName: string;
    capacity: number | "";
    personnel: number | "";
    avlNumber: string;
    psLteNumber: string;
    status: number;
};

type FireStation = {
    id: number;
    sido: string;
    name: string;
    address: string;
};

/* Excel row 형태 */
type ExcelRow = {
    시도?: string;
    소방서?: string;
    호출명?: string;
    차종?: string;
    용량?: string | number;
    인원?: string | number;
    AVL?: string;
    "PS-LTE"?: string;
};

type ExcelPreviewRow = {
    id: string;
    sido: string;
    stationName: string;
    typeName: string;
    callSign: string;
    capacity: number | "";
    personnel: number | "";
    avlNumber: string;
    psLteNumber: string;
};
/* ===========================================================
    숫자 변환 — 빈칸이면 "", 숫자만 남기고 변환
=========================================================== */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toNum = (v: any): number | "" => {
    if (v === null || v === undefined) return "";

    // 숫자 타입은 그대로
    if (typeof v === "number") {
        return isNaN(v) ? "" : v;
    }

    // 문자열 처리
    const raw = String(v).trim();
    if (raw === "") return "";

    // 숫자만 추출
    const digits = raw.replace(/[^\d]/g, "");
    if (digits === "") return "";

    return Number(digits);
};



const DEFAULT_STATUS = 0;

/* 시도 매핑 */
const SIDO_OPTIONS = [
    "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
    "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원도",
    "충청북도", "충청남도", "전라북도", "전라남도", "경상북도",
    "경상남도", "제주특별자치도"
];

const SIDO_MAP: Record<string, string> = {
    "서울": "서울특별시",
    "부산": "부산광역시",
    "대구": "대구광역시",
    "인천": "인천광역시",
    "광주": "광주광역시",
    "대전": "대전광역시",
    "울산": "울산광역시",
    "세종": "세종특별자치시",
    "경기": "경기도",
    "강원": "강원도",
    "충북": "충청북도",
    "충남": "충청남도",
    "전북": "전라북도",
    "전남": "전라남도",
    "경북": "경상북도",
    "경남": "경상남도",
    "제주": "제주특별자치도",
};

const toFullSido = (raw: string = "") => {
    const cleaned = raw.replace(/\s+/g, "");
    if (SIDO_OPTIONS.includes(cleaned)) return cleaned;
    return SIDO_MAP[cleaned] ?? cleaned;
};

const normalizeStationName = (name: string) => {
    if (!name) return "";
    return name.endsWith("소방서") ? name : `${name}소방서`;
};

/* ================================================
    RegisterTab
================================================ */
function RegisterTab() {
    const [form, setForm] = useState<ApiVehicle>({
        stationName: "",
        sido: "",
        callSign: "",
        typeName: "",
        capacity: "",
        personnel: "",
        avlNumber: "",
        psLteNumber: "",
        status: DEFAULT_STATUS,
    });

    const [stations, setStations] = useState<FireStation[]>([]);
    const [allStations, setAllStations] = useState<FireStation[]>([]);
    const [excelRows, setExcelRows] = useState<ExcelPreviewRow[]>([]);
    const [loading, setLoading] = useState(false);
    const fileRef = useRef<HTMLInputElement | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onChange = (key: keyof ApiVehicle, value: any) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    /* 🔥 소방서 전체 로드 */
    useEffect(() => {
        apiClient.get("/fire-stations").then((res) => setAllStations(res.data));

        console.log(toNum("2000L"));      // 2000
        console.log(toNum("1,500"));      // 1500
        console.log(toNum("1500 ℓ"));     // 1500
        console.log(toNum(" 1500 "));     // 1500
        console.log(toNum(1500));         // 1500
        console.log(toNum(""));           // ""
        console.log(toNum(undefined));    // ""
        console.log(toNum(null));         // ""
    }, []);

    /* 🔥 시도 바뀌면 소방서 필터링 */
    useEffect(() => {
        if (form.sido) {
            setStations(allStations.filter((s) => s.sido === form.sido));
        } else {
            setStations([]);
        }
        setForm((p) => ({ ...p, stationName: "" }));
    }, [form.sido, allStations]);

    /* ================================================
        엑셀 파싱
    ================================================= */
    const handlePickExcel = () => fileRef.current?.click();

    const handleExcel = async (file: File) => {
        try {
            const imported = await import("xlsx");
            const XLSX = imported.default || imported;

            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: "array" });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as ExcelRow[];

            const normalized = json.map((r) =>
                Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim(), v]))
            );

            const mapped = normalized.map((r, i) => ({
                id: `${file.name}-${i}`,
                sido: toFullSido(String(r["시도"] ?? "").trim()),
                stationName: normalizeStationName(String(r["소방서"] ?? "").trim()),
                typeName: String(r["차종"] ?? "").trim(),
                callSign: String(r["호출명"] ?? "").trim(),
                capacity: toNum(r["용량"]),
                personnel: toNum(r["인원"]),
                avlNumber: String(r["AVL"] ?? "").trim(),
                psLteNumber: String(r["PS-LTE"] ?? "").trim(),
            }));

            setExcelRows(mapped);
        } catch (err) {
            console.error(err);
            alert("엑셀 분석 실패");
        } finally {
            if (fileRef.current) fileRef.current.value = "";
        }
    };


    /* ================================================
        일괄 등록
    ================================================= */
    const handleBulkRegister = async () => {

        if (loading) return;

        if (excelRows.length === 0) return alert("엑셀 데이터 없음");

        const invalid = excelRows.find(
            (r) => !r.stationName || !r.typeName || !r.callSign
        );
        if (invalid) return alert("소방서/차종/호출명 누락된 행 존재");

        try {
            setLoading(true);

            const body = excelRows.map((r) => ({
                stationName: r.stationName,
                sido: r.sido,
                typeName: r.typeName,
                callSign: r.callSign,
                capacity: r.capacity === "" ? null : r.capacity,
                personnel: r.personnel === "" ? null : r.personnel,
                avlNumber: r.avlNumber,
                psLteNumber: r.psLteNumber,
            }));

            const res = await apiClient.post("/vehicles/batch", body);

            alert(
                `총 ${res.data.total} / 성공 ${res.data.inserted} / 중복 ${res.data.duplicates}`
            );

            setExcelRows([]);
        } catch (err: any) {
            console.error(err);
            alert(err?.response?.data?.message ?? "차량등록 실패");
        } finally {
            setLoading(false);
        }
    };

    /* ================================================
        단건 등록
    ================================================= */
    const handleRegister = async () => {
        if (!form.sido) return alert("시도 선택");
        if (!form.stationName) return alert("소방서 선택");

        const payload = {
            stationName: form.stationName,
            sido: form.sido,
            callSign: form.callSign,
            typeName: form.typeName,
            capacity: form.capacity === "" ? null : form.capacity,
            personnel: form.personnel === "" ? null : form.personnel,
            avlNumber: form.avlNumber,
            psLteNumber: form.psLteNumber,
            status: 0,
            rallyPoint: 0,
        };

        try {
            setLoading(true);
            await apiClient.post("/vehicles", payload);
            alert("등록 완료");

            setForm({
                stationName: "",
                sido: "",
                callSign: "",
                typeName: "",
                capacity: "",
                personnel: "",
                avlNumber: "",
                psLteNumber: "",
                status: 0,
            });
        } finally {
            setLoading(false);
        }
    };

    /* ================================================
        UI 렌더링
    ================================================= */
    return (
        <div className="p-6 space-y-6">

            {/* 신규 등록 */}
            <section className="border rounded">
                <header className="px-5 py-3 border-b font-semibold">신규 등록</header>

                <div className="p-5 space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">

                        <Select
                            label="시도"
                            value={form.sido}
                            onChange={(v) => onChange("sido", v)}
                            options={SIDO_OPTIONS}
                        />

                        <Select
                            label="소방서"
                            value={form.stationName}
                            onChange={(v) => onChange("stationName", v)}
                            options={stations.map((s) => s.name)}
                            disabled={!form.sido}
                        />

                        <Input label="차종"
                            value={form.typeName}
                            onChange={(v) => onChange("typeName", v)}
                        />

                        <Input label="호출명"
                            value={form.callSign}
                            onChange={(v) => onChange("callSign", v)}
                        />

                        <Input label="용량"
                            value={String(form.capacity)}
                            onChange={(v) => onChange("capacity", toNum(v))}
                        />

                        <Input label="인원"
                            value={String(form.personnel)}
                            onChange={(v) => onChange("personnel", toNum(v))}
                        />

                        <InputMasked label="AVL 단말기"
                            value={form.avlNumber}
                            onChange={(v) => onChange("avlNumber", v)}
                        />

                        <InputMasked label="PS-LTE 번호"
                            value={form.psLteNumber}
                            onChange={(v) => onChange("psLteNumber", v)}
                        />

                    </div>

                    <button
                        onClick={handleRegister}
                        className="px-4 h-9 bg-[#e1412b] text-white rounded"
                    >
                        {loading ? "등록 중..." : "차량 등록"}
                    </button>

                    <input
                        ref={fileRef}
                        type="file"
                        accept=".xls,.xlsx"
                        onChange={(e) =>
                            e.target.files?.[0] && handleExcel(e.target.files[0])
                        }
                        className="hidden"
                    />
                </div>
            </section>

            {/* 엑셀 업로드 */}
            <section className="border rounded">
                <header className="px-5 py-3 border-b font-semibold">엑셀 업로드</header>

                <div className="p-5 space-y-3">

                    <div className="flex gap-3">
                        <button
                            onClick={handlePickExcel}
                            className="px-4 h-9 bg-[#ff6b35] text-white rounded"
                        >
                            파일 선택
                        </button>

                        <button
                            onClick={handleBulkRegister}
                            disabled={loading || excelRows.length === 0}
                            className="px-4 h-9 bg-[#e1412b] text-white rounded disabled:opacity-50"
                        >
                            {loading ? "등록 중..." : "일괄 등록"}
                        </button>

                    </div>

                    <div className="overflow-auto border rounded">
                        <table className="min-w-[900px] w-full text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th>시도</th>
                                    <th>소방서</th>
                                    <th>차종</th>
                                    <th>호출명</th>
                                    <th>용량</th>
                                    <th>인원</th>
                                    <th>AVL</th>
                                    <th>PS-LTE</th>
                                </tr>
                            </thead>

                            <tbody>
                                {excelRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-6 text-gray-400">
                                            선택된 파일 없음
                                        </td>
                                    </tr>
                                ) : (
                                    excelRows.map((r) => (
                                        <tr key={r.id} className="even:bg-gray-50">
                                            <Td>{r.sido}</Td>
                                            <Td>{r.stationName}</Td>
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

/* ================================================
    UI COMPONENTS
================================================ */
function Select({
    label,
    value,
    onChange,
    options,
    disabled = false,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
    disabled?: boolean;
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">{label}</span>
            <select
                className="h-9 border rounded px-3"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
            >
                <option value="">선택하세요</option>
                {options.map((op) => (
                    <option key={op} value={op}>{op}</option>
                ))}
            </select>
        </label>
    );
}

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
            <span className="text-sm text-gray-700">{label}</span>
            <input
                value={value}
                type={type}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 border rounded px-3"
            />
        </label>
    );
}

function InputMasked({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    const handleInput = (raw: string) => {
        let digits = raw.replace(/\D/g, "");
        if (digits.length > 11) digits = digits.slice(0, 11);
        onChange(digits);
    };

    const format = (digits: string) => {
        if (digits.length <= 3) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    };

    return (
        <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">{label}</span>
            <input
                value={format(value)}
                onChange={(e) => handleInput(e.target.value)}
                className="h-9 border rounded px-3"
            />
        </label>
    );
}

function Td({ children }: { children: React.ReactNode }) {
    return <td className="px-3 py-2 border-t">{children}</td>;
}

export default RegisterTab;
