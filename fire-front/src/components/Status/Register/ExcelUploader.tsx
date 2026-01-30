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
    setRallyPoint,
}: ExcelUploaderProps) {
    // 전화번호에서 숫자만 추출 (하이픈, 공백 등 제거)
    const normalizePhone = (value: string | number | undefined): string => {
        if (value == null) return "";
        const digits = String(value).replace(/\D/g, "");
        return digits.slice(0, 11); // 최대 11자리
    };

    // 전화번호 포맷팅 (표시용)
    const formatPhone = (digits: string): string => {
        if (!digits) return "";
        if (digits.length <= 3) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    };

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

        const mapped: ExcelPreviewRow[] = normalized.map((r, i) => ({
            id: `${file.name}-${i}`,
            sido: toFullSido(r["시도"]),
            stationName: normalizeStationName(r["소방서"]),
            typeName: r["차종"] ?? "",
            callSign: r["호출명"] ?? "",
            capacity: toNum(r["용량"]),
            personnel: toNum(r["인원"]),
            avlNumber: normalizePhone(r["AVL"]),
            psLteNumber: normalizePhone(r["PS-LTE"]),
        }));

        setExcelRows(mapped);
        if (fileRef.current) fileRef.current.value = "";
    };

    return (
        <section className="border rounded">
            <header className="px-5 py-3 border-b font-semibold">
                엑셀 업로드
            </header>

            <div className="p-5 space-y-3">
                {/* 🔸 버튼 + 자원집결지 주소 한 줄 배치 */}
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

                    {/* 👉 버튼 옆에 붙는 자원집결지 입력 */}
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
                            문자 발송 시 안내에 사용됩니다. (DB rallyPoint 플래그와는 별개)
                        </span>
                    </label>
                </div>

                {/* 🔸 엑셀 표 */}
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
                                    <td
                                        colSpan={8}
                                        className="text-center py-6 text-gray-400"
                                    >
                                        선택된 파일 없음
                                    </td>
                                </tr>
                            ) : (
                                excelRows.map((r) => (
                                    <tr key={r.id} className="even:bg-gray-50">
                                        <td className="px-3 py-2 border-t">
                                            {r.sido}
                                        </td>
                                        <td className="px-3 py-2 border-t">
                                            {r.stationName}
                                        </td>
                                        <td className="px-3 py-2 border-t">
                                            {r.typeName}
                                        </td>
                                        <td className="px-3 py-2 border-t">
                                            {r.callSign}
                                        </td>
                                        <td className="px-3 py-2 border-t">
                                            {r.capacity}
                                        </td>
                                        <td className="px-3 py-2 border-t">
                                            {r.personnel}
                                        </td>
                                        <td className="px-3 py-2 border-t">
                                            {formatPhone(r.avlNumber)}
                                        </td>
                                        <td className="px-3 py-2 border-t">
                                            {formatPhone(r.psLteNumber)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 숨겨진 파일 input */}
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
