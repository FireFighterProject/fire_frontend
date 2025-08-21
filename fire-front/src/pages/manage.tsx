// src/pages/Manage.tsx
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type { Vehicle } from "../types/global";

// 차종(열) 키 리터럴 타입
type VehicleTypeKey =
  | "경펌" | "소펌" | "중펌" | "대펌"
  | "중형탱크" | "대형탱크" | "급수탱크"
  | "화학" | "산불" | "험지"
  | "로젠바우어" | "산불신속팀"
  | "구조" | "구급"
  | "지휘" | "조사"
  | "굴절" | "고가" | "배연"
  | "회복" | "지원" | "기타";

// 표 한 행 타입
type StatusRow = {
  구분: string;
  "차량(계)": number;
  "인원(계)": number;
} & Record<VehicleTypeKey, number>;

// 열 순서
const COL_ORDER: VehicleTypeKey[] = [
  "경펌", "소펌", "중펌", "대펌",
  "중형탱크", "대형탱크", "급수탱크",
  "화학", "산불", "험지", "로젠바우어", "산불신속팀",
  "구조", "구급", "지휘", "조사", "굴절", "고가", "배연", "회복", "지원", "기타",
];

// 샘플 데이터
const SAMPLE_VEHICLES: Vehicle[] = [
  { id: "1", sido: "경북", station: "포항", type: "로젠바우어", callname: "포항-1", capacity: "1400", personnel: "3", avl: "-", pslte: "-", status: "대기", rally: true },
  { id: "2", sido: "서울", station: "강서", type: "구급", callname: "강서-2", capacity: "", personnel: "3", avl: "-", pslte: "-", status: "활동" },
  { id: "3", sido: "경북", station: "구미", type: "중형탱크", callname: "구미-3", capacity: "", personnel: "4", avl: "-", pslte: "-", status: "활동", rally: true },
  { id: "4", sido: "인천", station: "남동", type: "경펌", callname: "남동-4", capacity: "", personnel: "2", avl: "-", pslte: "-", status: "대기" },
  { id: "5", sido: "경북", station: "영천", type: "화학", callname: "영천-5", capacity: "", personnel: "5", avl: "-", pslte: "-", status: "대기", rally: false },
];

// 차종 문자열 → 열 키로 정규화
function normalizeType(type: string): VehicleTypeKey {
  if (type.includes("경펌")) return "경펌";
  if (type.includes("소펌")) return "소펌";
  if (type.includes("중펌")) return "중펌";
  if (type.includes("대펌")) return "대펌";
  if (type.includes("중형탱크")) return "중형탱크";
  if (type.includes("대형탱크")) return "대형탱크";
  if (type.includes("급수")) return "급수탱크";
  if (type.includes("화학")) return "화학";
  if (type.includes("산불") && !type.includes("신속")) return "산불";
  if (type.includes("험지")) return "험지";
  if (type.includes("로젠")) return "로젠바우어";
  if (type.includes("신속")) return "산불신속팀";
  if (type.includes("구조")) return "구조";
  if (type.includes("구급")) return "구급";
  return "기타";
}

// 상태 문자열 → "대기" | "활동"
function normalizeStatus(status: string | undefined): "대기" | "활동" {
  const s = status ?? "";
  if (s.includes("활동") || s.includes("임무")) return "활동";
  return "대기";
}

// 집계 행 생성
function buildRows(vehicles: Vehicle[], isDisaster: boolean): StatusRow[] {
  const rows: StatusRow[] = [];

  const calcRow = (label: string, filterFn: (v: Vehicle) => boolean): StatusRow => {
    const subset: Vehicle[] = vehicles.filter(filterFn);
    const row: StatusRow = {
      구분: label,
      "차량(계)": subset.length,
      "인원(계)": subset.reduce((sum, v) => sum + (Number(v.personnel) || 0), 0),
      경펌: 0, 소펌: 0, 중펌: 0, 대펌: 0,
      중형탱크: 0, 대형탱크: 0, 급수탱크: 0,
      화학: 0, 산불: 0, 험지: 0, 로젠바우어: 0, 산불신속팀: 0,
      구조: 0, 구급: 0,
      지휘: 0, 조사: 0,
      굴절: 0, 고가: 0, 배연: 0,
      회복: 0, 지원: 0, 기타: 0,
    };

    subset.forEach((v) => {
      const key = normalizeType(v.type);
      row[key] = (row[key] ?? 0) + 1;
    });

    return row;
  };

  // 평상시
  if (!isDisaster) {
    rows.push(calcRow("경북 전체", (v) => v.sido === "경북"));
    return rows;
  }

  // 재난시
  const isGB = (v: Vehicle) => v.sido === "경북";
  const isRally = (v: Vehicle) => v.rally === true;

  rows.push(calcRow("경북 전체", (v) => isGB(v) && isRally(v)));
  rows.push(calcRow("경북 대기", (v) => isGB(v) && isRally(v) && normalizeStatus(v.status) === "대기"));
  rows.push(calcRow("경북 활동", (v) => isGB(v) && isRally(v) && normalizeStatus(v.status) === "활동"));

  const otherRegions = Array.from(
    new Set(vehicles.filter((v) => v.sido !== "경북").map((v) => v.sido)),
  ).sort();

  otherRegions.forEach((region) => {
    rows.push(calcRow(`${region} 전체`, (v) => v.sido === region));
    rows.push(calcRow(`${region} 대기`, (v) => v.sido === region && normalizeStatus(v.status) === "대기"));
    rows.push(calcRow(`${region} 활동`, (v) => v.sido === region && normalizeStatus(v.status) === "활동"));
  });

  return rows;
}

const Status = () => {
  const isDisaster = useSelector((state: RootState) => state.emergency.isDisaster);
  const [vehicles] = useState<Vehicle[]>(SAMPLE_VEHICLES);

  const rows = useMemo(() => buildRows(vehicles, isDisaster), [vehicles, isDisaster]);

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <section className="flex items-center gap-3 px-6 py-4 border-b">
        <h2 className="text-lg font-semibold">총괄현황</h2>
      </section>

      {/* 테이블 */}
      <section className="p-4 overflow-x-auto">
        <table className="table-auto w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 whitespace-nowrap">구분</th>
              <th className="border px-2 py-1 whitespace-nowrap">차량(계)</th>
              <th className="border px-2 py-1 whitespace-nowrap">인원(계)</th>
              {COL_ORDER.map((c) => (
                <th
                  key={c}
                  className="border px-2 py-1 whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.구분 + idx} className={idx % 2 ? "bg-gray-50" : "bg-white"}>
                <td className="border px-2 py-1 text-left font-medium whitespace-nowrap">{r["구분"]}</td>
                <td className="border px-2 py-1 text-center whitespace-nowrap">{r["차량(계)"]}</td>
                <td className="border px-2 py-1 text-center whitespace-nowrap">{r["인원(계)"]}</td>
                {COL_ORDER.map((k) => (
                  <td key={k} className="border px-2 py-1 text-center whitespace-nowrap">
                    {r[k]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

    </div>
  );
};

export default Status;
