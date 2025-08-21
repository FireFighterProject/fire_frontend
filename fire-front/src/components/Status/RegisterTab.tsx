// src/pages/Status.tsx
import React, {  useRef, useState } from "react";

import type { Vehicle } from "../../types/global"; 

function RegisterTab() {
    const [form, setForm] = useState<Vehicle>({
        id: crypto.randomUUID(),
        sido: "",
        station: "",
        type: "",
        callname: "",
        capacity: "",
        personnel: "",
        avl: "",
        pslte: "",
    });

    const [excelRows, setExcelRows] = useState<Vehicle[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const onChange = (k: keyof Vehicle, v: string) =>
        setForm((p) => ({ ...p, [k]: v }));

    const handleRegister = () => {
        if (!form.sido || !form.station || !form.type || !form.callname) {
            alert("시도/소방서/차종/호출명을 입력해주세요.");
            return;
        }
        alert("차량이 임시로 등록되었습니다. (실제 API 연결 시 이곳에서 POST)");
        setForm({
            id: crypto.randomUUID(),
            sido: "",
            station: "",
            type: "",
            callname: "",
            capacity: "",
            personnel: "",
            avl: "",
            pslte: "",
        });
    };

    const handlePickExcel = () => fileInputRef.current?.click();

    const handleExcelFile = async (file: File) => {
        try {
            // xlsx 사용 가능 시 미리보기 파싱
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const XLSX: any = (await import("xlsx")).default ?? (await import("xlsx"));
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: "array" });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as [];

            const mapped: Vehicle[] = json.map((r, i) => ({
                id: `${file.name}-${i}`,
                sido: r["시도"] ?? "",
                station: r["소방서"] ?? "",
                type: r["차종"] ?? "",
                callname: r["호출명"] ?? "",
                capacity: r["용량"] ?? "",
                personnel: r["인원"] ?? "",
                avl: r["AVL 단말기번호"] ?? r["AVL"] ?? "",
                pslte: r["PS-LTE 번호"] ?? r["PS-LTE"] ?? "",
            }));
            setExcelRows(mapped);
        } catch {
            // xlsx가 없거나 실패한 경우 파일명만 보이게
            setExcelRows([
                {
                    id: file.name,
                    sido: "",
                    station: "",
                    type: "",
                    callname: `파일 선택: ${file.name}`,
                    capacity: "",
                    personnel: "",
                    avl: "",
                    pslte: "",
                },
            ]);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* 신규등록 카드 */}
            <section className="rounded-md border border-gray-200">
                <header className="px-5 py-3 border-b border-gray-100 font-semibold">
                    신규등록
                </header>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="시도" value={form.sido} onChange={(v) => onChange("sido", v)} />
                        <Input label="소방서" value={form.station} onChange={(v) => onChange("station", v)} />
                        <Input label="차종" value={form.type} onChange={(v) => onChange("type", v)} />
                        <Input label="호출명" value={form.callname} onChange={(v) => onChange("callname", v)} />
                        <Input label="용량" value={form.capacity} onChange={(v) => onChange("capacity", v)} />
                        <Input label="인원" value={form.personnel} onChange={(v) => onChange("personnel", v)} />
                        <Input label="AVL 단말기 번호" value={form.avl} onChange={(v) => onChange("avl", v)} />
                        <Input label="PS-LTE 번호" value={form.pslte} onChange={(v) => onChange("pslte", v)} />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={handleRegister}
                            className="px-4 h-9 rounded-md bg-[#e1412b] text-white text-sm font-semibold hover:brightness-95"
                        >
                            차량등록
                        </button>

                        <button
                            onClick={handlePickExcel}
                            className="px-4 h-9 rounded-md bg-[#ff6b35] text-white text-sm font-semibold hover:brightness-95"
                        >
                            엑셀 파일 선택
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
            <section className="rounded-md border border-gray-200">
                <header className="px-5 py-3 border-b border-gray-100 font-semibold">
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
                            onClick={() => alert("엑셀 데이터로 차량등록 (API 연동 지점)")}
                            className="px-4 h-9 rounded-md bg-[#e1412b] text-white text-sm font-semibold hover:brightness-95"
                        >
                            차량등록
                        </button>
                    </div>

                    <div className="overflow-auto border border-gray-200 rounded">
                        <table className="min-w-[720px] w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
                                    <th>시도</th>
                                    <th>소방서</th>
                                    <th>차종</th>
                                    <th>호출명</th>
                                    <th>용량</th>
                                    <th>인원</th>
                                    <th>AVL 단말기번호</th>
                                    <th>PS-LTE 번호</th>
                                </tr>
                            </thead>
                            <tbody>
                                {excelRows.length === 0 ? (
                                    <tr>
                                        <td className="px-3 py-6 text-center text-gray-500" colSpan={8}>
                                            선택된 파일이 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    excelRows.map((r) => (
                                        <tr key={r.id} className="even:bg-gray-50/40">
                                            <Td>{r.sido}</Td>
                                            <Td>{r.station}</Td>
                                            <Td>{r.type}</Td>
                                            <Td>{r.callname}</Td>
                                            <Td>{r.capacity}</Td>
                                            <Td>{r.personnel}</Td>
                                            <Td>{r.avl}</Td>
                                            <Td>{r.pslte}</Td>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[13px] text-gray-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 border-t border-gray-100">{children}</td>;
}

export default RegisterTab;