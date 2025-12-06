// src/components/Status/Register/ExcelUploader.tsx
import type { ExcelPreviewRow } from "../RegisterTab";
import type { RefObject } from "react";

interface ExcelRawRow {
    시도?: string;
    소방서?: string;
    차종?: string;
    호출명?: string;
    용량?: string | number;
    인원?: string | number;
    AVL?: string;
    "PS-LTE"?: string;
}

interface ExcelUploaderProps {
    fileRef: RefObject<HTMLInputElement | null>;
    excelRows: ExcelPreviewRow[];
    setExcelRows: (rows: ExcelPreviewRow[]) => void;
    loading: boolean;
    handleBulkRegister: (rallyPoint: string) => void;
    toFullSido: (v: string | undefined) => string;
    normalizeStationName: (v: string | undefined) => string;
    toNum: (v: string | number | undefined) => number | "";
    rallyPoint: string;
    setRallyPoint: (v: string) => void;
}

function ExcelUploader({
    fileRef,
    excelRows,
    setExcelRows,
    loading,
    handleBulkRegister,
    toFullSido,
    normalizeStationName,
    toNum,
    rallyPoint,
    setRallyPoint
}: ExcelUploaderProps) {

    const parseExcel = async (file: File) => {
        const imported = await import("xlsx");
        const XLSX = imported.default || imported;

        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];

        const json = XLSX.utils.sheet_to_json<ExcelRawRow>(sheet, { defval: "" });

        const mapped: ExcelPreviewRow[] = json.map((r, i) => ({
            id: `${file.name}-${i}`,
            sido: toFullSido(r["시도"]),
            stationName: normalizeStationName(r["소방서"]),
            typeName: r["차종"] ?? "",
            callSign: r["호출명"] ?? "",
            capacity: toNum(r["용량"]),
            personnel: toNum(r["인원"]),
            avlNumber: r["AVL"] ?? "",
            psLteNumber: r["PS-LTE"] ?? "",
        }));

        setExcelRows(mapped);
        if (fileRef.current) fileRef.current.value = "";
    };

    return (
        <section className="border rounded">
            <header className="px-5 py-3 border-b font-semibold">엑셀 업로드</header>

            <div className="p-5 space-y-3">

                <div className="flex gap-3 items-center">

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

                    {/* 자원집결지 주소 입력 */}
                    <label className="flex flex-col text-sm text-gray-700">
                        자원집결지 주소
                        <input
                            type="text"
                            value={rallyPoint}
                            onChange={(e) => setRallyPoint(e.target.value)}
                            className="h-9 border rounded px-3 w-72"
                            placeholder="예: 대구광역시 중구 중앙대로 123"
                        />
                    </label>

                    <input
                        type="file"
                        className="hidden"
                        ref={fileRef}
                        accept=".xls,.xlsx"
                        onChange={(e) => e.target.files?.[0] && parseExcel(e.target.files[0])}
                    />
                </div>

                {/* Excel 표 */}
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
                                        <td>{r.sido}</td>
                                        <td>{r.stationName}</td>
                                        <td>{r.typeName}</td>
                                        <td>{r.callSign}</td>
                                        <td>{r.capacity}</td>
                                        <td>{r.personnel}</td>
                                        <td>{r.avlNumber}</td>
                                        <td>{r.psLteNumber}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </section>
    );
}

export default ExcelUploader;
