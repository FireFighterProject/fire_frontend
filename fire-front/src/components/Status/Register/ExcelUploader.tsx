// src/components/Status/Register/ExcelUploader.tsx
import type { ExcelPreviewRow } from "../RegisterTab";
import type { RefObject } from "react";
import { formatPhone, normalizePhone } from "../../../services/Register/utils";

interface ExcelRawRow {
    연번?: string | number;
    소방서?: string;
    호출명?: string;
    차종?: string;
    인원?: string | number;
    연락처?: string;
}

interface ExcelUploaderProps {
    fileRef: RefObject<HTMLInputElement | null>;
    excelRows: ExcelPreviewRow[];
    setExcelRows: (rows: ExcelPreviewRow[]) => void;
    loading: boolean;
    handleBulkRegister: (rallyPoint: string) => void;
    normalizeStationName: (v: string | undefined) => string;
    resolveSidoFromStation: (stationName: string) => string;
    toNum: (v: string | number | undefined) => number | "";
    rallyPoint: string;
    setRallyPoint: (v: string) => void;
}

const TH =
    "border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 whitespace-nowrap";
const TD =
    "border border-gray-300 px-3 py-2 text-center text-gray-900 whitespace-nowrap";

function ExcelUploader({
    fileRef,
    excelRows,
    setExcelRows,
    loading,
    handleBulkRegister,
    normalizeStationName,
    resolveSidoFromStation,
    toNum,
    rallyPoint,
    setRallyPoint,
}: ExcelUploaderProps) {
    const parseExcel = async (file: File) => {
        const imported = await import("xlsx");
        const XLSX = imported.default || imported;

        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];

        const json = XLSX.utils.sheet_to_json<ExcelRawRow>(sheet, { defval: "" });

        const normalized = json.map(
            (r) =>
                Object.fromEntries(
                    Object.entries(r).map(([k, v]) => [k.trim(), v])
                ) as ExcelRawRow
        );

        const mapped: ExcelPreviewRow[] = normalized.map((r, i) => {
            const stationName = normalizeStationName(r["소방서"]);
            return {
                id: `${file.name}-${i}`,
                serialNo: toNum(r["연번"]),
                stationName,
                callSign: r["호출명"] ?? "",
                typeName: r["차종"] ?? "",
                personnel: toNum(r["인원"]),
                contact: normalizePhone(r["연락처"]),
                sido: resolveSidoFromStation(stationName),
            };
        });

        setExcelRows(mapped);
        if (fileRef.current) fileRef.current.value = "";
    };

    return (
        <section className="border rounded">
            <header className="px-5 py-3 border-b font-semibold">
                엑셀 업로드
            </header>

            <div className="p-5 space-y-3">
                <div className="flex flex-wrap gap-3 items-center">
                    <button
                        onClick={() => fileRef.current?.click()}
                        className="px-4 h-9 bg-[#ff6b35] text-white rounded"
                    >
                        파일 선택
                    </button>

                    <button
                        onClick={() => handleBulkRegister(rallyPoint)}
                        disabled={loading || excelRows.length === 0}
                        className="px-4 h-9 bg-[#e1412b] text-white rounded disabled:opacity-50"
                    >
                        {loading ? "등록 중..." : "일괄 등록"}
                    </button>

                    <label className="flex flex-col text-sm text-gray-700 w-80">
                        자원집결지 주소
                        <input
                            type="text"
                            value={rallyPoint}
                            onChange={(e) => setRallyPoint(e.target.value)}
                            className="h-9 border rounded px-3 mt-1"
                            placeholder="예: 경상북도 구미시 상모로 71"
                        />
                        <span className="mt-1 text-xs text-gray-500">
                            문자 발송 시 안내에 사용됩니다. 
                        </span>
                    </label>
                </div>

                <div className="overflow-auto border border-gray-300 rounded">
                    <table className="w-full min-w-[720px] text-sm border-collapse table-fixed">
                        <colgroup>
                            <col className="w-[64px]" />
                            <col className="w-[120px]" />
                            <col className="w-[120px]" />
                            <col className="w-[80px]" />
                            <col className="w-[64px]" />
                            <col className="w-[140px]" />
                        </colgroup>
                        <thead className="bg-gray-100">
                            <tr>
                                <th className={TH}>연번</th>
                                <th className={TH}>소방서</th>
                                <th className={TH}>호출명</th>
                                <th className={TH}>차종</th>
                                <th className={TH}>인원</th>
                                <th className={TH}>연락처</th>
                            </tr>
                        </thead>

                        <tbody>
                            {excelRows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="border border-gray-300 text-center py-6 text-gray-400"
                                    >
                                        선택된 파일 없음
                                    </td>
                                </tr>
                            ) : (
                                excelRows.map((r) => (
                                    <tr key={r.id} className="even:bg-gray-50/60">
                                        <td className={TD}>{r.serialNo}</td>
                                        <td className={TD}>{r.stationName}</td>
                                        <td className={TD}>{r.callSign}</td>
                                        <td className={TD}>{r.typeName}</td>
                                        <td className={TD}>{r.personnel}</td>
                                        <td className={TD}>{formatPhone(r.contact)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <input
                    type="file"
                    className="hidden"
                    ref={fileRef}
                    accept=".xls,.xlsx"
                    onChange={(e) =>
                        e.target.files?.[0] && parseExcel(e.target.files[0])
                    }
                />
            </div>
        </section>
    );
}

export default ExcelUploader;
