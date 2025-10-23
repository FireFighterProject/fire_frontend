// src/pages/Manage.tsx
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type { Vehicle } from "../types/global";

/* =========================
 * 차종(열) 키 리터럴 타입
 * ========================= */
type VehicleTypeKey =
  | "경펌" | "소펌" | "중펌" | "대펌"
  | "중형탱크" | "대형탱크" | "급수탱크"
  | "화학" | "산불" | "험지"
  | "로젠바우어" | "산불신속팀"
  | "구조" | "구급"
  | "지휘" | "조사"
  | "굴절" | "고가" | "배연"
  | "회복" | "지원" | "기타";

/** 표 한 행 타입 */
type StatusRow = {
  구분: string;
  "차량(계)": number;
  "인원(계)": number;
} & Record<VehicleTypeKey, number>;

/** 열 순서 */
const COL_ORDER: VehicleTypeKey[] = [
  "경펌", "소펌", "중펌", "대펌",
  "중형탱크", "대형탱크", "급수탱크",
  "화학", "산불", "험지", "로젠바우어", "산불신속팀",
  "구조", "구급", "지휘", "조사", "굴절", "고가", "배연", "회복", "지원", "기타",
];

/* ---------------------------------------------------
 * 안전 유틸 (타입 의존성 낮추기)
 * --------------------------------------------------- */
function getStationName(v: Vehicle): string {
  const vv = v as unknown as { station?: string; stationName?: string };
  return vv.station ?? vv.stationName ?? "";
}
function getCallname(v: Vehicle): string {
  const vv = v as unknown as { callname?: string; callSign?: string; name?: string; id: number };
  return vv.callname ?? vv.callSign ?? vv.name ?? `V-${vv.id}`;
}
function isRally(v: Vehicle): boolean {
  const vv = v as unknown as { rally?: boolean; rallyPoint?: number };
  return vv.rally === true || vv.rallyPoint === 1;
}

/* ---------------------------------------------------
 * 차종 문자열 → 열 키로 정규화
 *  - 업로드/입력의 표현 차이를 표준화
 * --------------------------------------------------- */
function normalizeType(type: string | undefined): VehicleTypeKey {
  const t = String(type ?? "");
  if (t.includes("경펌")) return "경펌";
  if (t.includes("소펌")) return "소펌";
  if (t.includes("중펌")) return "중펌";
  if (t.includes("대펌")) return "대펌";
  if (t.includes("중형탱크")) return "중형탱크";
  if (t.includes("대형탱크")) return "대형탱크";
  if (t.includes("급수")) return "급수탱크";
  if (t.includes("화학")) return "화학";
  if (t.includes("산불") && !t.includes("신속")) return "산불";
  if (t.includes("험지")) return "험지";
  if (t.includes("로젠")) return "로젠바우어";
  if (t.includes("신속")) return "산불신속팀";
  if (t.includes("구조")) return "구조";
  if (t.includes("구급")) return "구급";
  if (t.includes("고가")) return "고가";
  if (t.includes("지휘")) return "지휘";
  return "기타";
}

/* ---------------------------------------------------
 * 상태 문자열 → "대기" | "활동" 으로 단순화
 *  - 화면 집계용: "출동중/복귀/철수" 등은 가까운 값으로 매핑
 * --------------------------------------------------- */
function normalizeStatus(status: string | undefined): "대기" | "활동" {
  const s = status ?? "";
  if (s.includes("활동") || s.includes("임무") || s.includes("출동") || s.toLowerCase().includes("dispatch")) {
    return "활동";
  }
  return "대기";
}

/* ---------------------------------------------------
 * 집계 행 생성 (입력 차량 배열에 대해서만 계산)
 *  - 평상시: 경북 전체만
 *  - 재난시: 경북(집결지) + 타 시도 대기/활동 분할
 * --------------------------------------------------- */
function buildRows(vehicles: Vehicle[], isDisaster: boolean): StatusRow[] {
  const rows: StatusRow[] = [];

  const calcRow = (label: string, filterFn: (v: Vehicle) => boolean): StatusRow => {
    const subset = vehicles.filter(filterFn);
    const row: StatusRow = {
      구분: label,
      "차량(계)": subset.length,
      "인원(계)": subset.reduce((sum, v) => sum + (Number((v as unknown as { personnel?: number }).personnel) || 0), 0),
      경펌: 0, 소펌: 0, 중펌: 0, 대펌: 0,
      중형탱크: 0, 대형탱크: 0, 급수탱크: 0,
      화학: 0, 산불: 0, 험지: 0, 로젠바우어: 0, 산불신속팀: 0,
      구조: 0, 구급: 0,
      지휘: 0, 조사: 0,
      굴절: 0, 고가: 0, 배연: 0,
      회복: 0, 지원: 0, 기타: 0,
    };

    subset.forEach((v) => {
      const key = normalizeType((v as unknown as { type?: string }).type);
      row[key] = (row[key] ?? 0) + 1;
    });

    return row;
  };

  // 평상시: 경북 전체 1행
  if (!isDisaster) {
    rows.push(calcRow("경북 전체", (v) => (v as unknown as { sido?: string }).sido === "경북"));
    return rows;
  }

  // 재난시: 경북(집결지 true) + 타시도
  const isGB = (v: Vehicle) => (v as unknown as { sido?: string }).sido === "경북";

  rows.push(calcRow("경북 전체", (v) => isGB(v) && isRally(v)));
  rows.push(calcRow("경북 대기", (v) => isGB(v) && isRally(v) && normalizeStatus((v as unknown as { status?: string }).status) === "대기"));
  rows.push(calcRow("경북 활동", (v) => isGB(v) && isRally(v) && normalizeStatus((v as unknown as { status?: string }).status) === "활동"));

  const otherRegions = Array.from(
    new Set(
      vehicles
        .filter((v) => (v as unknown as { sido?: string }).sido !== "경북")
        .map((v) => (v as unknown as { sido?: string }).sido ?? "")
    )
  ).sort();

  otherRegions.forEach((region) => {
    rows.push(calcRow(`${region} 전체`, (v) => (v as unknown as { sido?: string }).sido === region));
    rows.push(calcRow(`${region} 대기`, (v) => (v as unknown as { sido?: string }).sido === region && normalizeStatus((v as unknown as { status?: string }).status) === "대기"));
    rows.push(calcRow(`${region} 활동`, (v) => (v as unknown as { sido?: string }).sido === region && normalizeStatus((v as unknown as { status?: string }).status) === "활동"));
  });

  return rows;
}

/* ---------------------------------------------------
 * 라벨(행) → 필터 함수
 *  - 어떤 행을 클릭했는지에 따라 실제 차량 선택 조건 생성
 * --------------------------------------------------- */
function buildRowPredicate(label: string, isDisaster: boolean): (v: Vehicle) => boolean {
  const [regionRaw, statusMaybe] = label.split(" ");
  const region = regionRaw ?? "";
  const wantsAll = statusMaybe === "전체";
  const wantsWait = statusMaybe === "대기";
  const wantsActive = statusMaybe === "활동";

  return (v: Vehicle) => {
    const sido = (v as unknown as { sido?: string }).sido ?? "";

    // 지역 매칭
    if (region !== "경북") {
      if (sido !== region) return false;
    } else {
      if (sido !== "경북") return false;
      if (isDisaster && !isRally(v)) return false; // 경북 행은 집결지 true만
    }

    // 상태 매칭
    const s = normalizeStatus((v as unknown as { status?: string }).status);
    if (wantsWait && s !== "대기") return false;
    if (wantsActive && s !== "활동") return false;

    // "전체"는 상태 무관
    if (wantsAll || (!wantsWait && !wantsActive)) return true;
    return true;
  };
}

/* =========================
 * 페이지 컴포넌트
 * ========================= */
type AssignedItem = {
  id: number;
  callname: string;
  sido: string;
  station: string;
  type: string;
};

const Manage: React.FC = () => {
  // 재난 모드 여부
  const isDisaster = useSelector((state: RootState) => state.emergency.isDisaster);

  // 전역 차량 목록
  const vehicles = useSelector((state: RootState) => state.vehicle.vehicles) as Vehicle[];

  // ✅ 편성 상태
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set());
  const [assigned, setAssigned] = useState<AssignedItem[]>([]);

  // 미편성(남은) 차량만 집계
  const remainingVehicles = useMemo(
    () => vehicles.filter(v => !assignedIds.has((v as unknown as { id: number }).id)),
    [vehicles, assignedIds]
  );

  // 집계 행 메모
  const rows = useMemo(() => buildRows(remainingVehicles, isDisaster), [remainingVehicles, isDisaster]);

  // 셀 클릭 → 해당 조건 + 타입키에 맞는 차량 1대 편성
  function handleAssignOne(rowLabel: string, typeKey: VehicleTypeKey) {
    const predicate = buildRowPredicate(rowLabel, isDisaster);
    const candidate = remainingVehicles.find(
      (v) => predicate(v) && normalizeType((v as unknown as { type?: string }).type) === typeKey
    );
    if (!candidate) return; // 남은 차량 없음

    const id = (candidate as unknown as { id: number }).id;
    setAssignedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    setAssigned(prev => [
      ...prev,
      {
        id,
        callname: getCallname(candidate),
        sido: (candidate as unknown as { sido?: string }).sido ?? "",
        station: getStationName(candidate),
        type: (candidate as unknown as { type?: string }).type ?? "",
      },
    ]);
  }

  function unassignOne(id: number) {
    setAssignedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setAssigned(prev => prev.filter(a => a.id !== id));
  }

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
                <th key={c} className="border px-2 py-1 whitespace-nowrap">
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

                {COL_ORDER.map((k) => {
                  const val = r[k];
                  const canClick = val > 0;
                  return (
                    <td
                      key={k}
                      className={
                        "border px-2 py-1 text-center whitespace-nowrap select-none " +
                        (canClick ? "cursor-pointer hover:bg-blue-50" : "text-gray-400")
                      }
                      title={canClick ? "클릭하면 1대 편성" : "편성 가능한 차량 없음"}
                      onClick={() => canClick && handleAssignOne(r.구분, k)}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 편성된 차량 목록 */}
      <section className="p-4">
        <h3 className="font-semibold mb-2">편성 차량</h3>
        {assigned.length === 0 ? (
          <div className="text-sm text-gray-500">아직 편성된 차량이 없습니다. 표의 수량 셀을 클릭해 편성하세요.</div>
        ) : (
          <ul className="space-y-2">
            {assigned.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between border rounded px-3 py-2 text-sm bg-white"
              >
                <div className="flex flex-wrap gap-3">
                  <span className="font-medium">{a.callname}</span>
                  <span className="text-gray-600">{a.sido} · {a.station}</span>
                  <span className="text-gray-600">{a.type}</span>
                </div>
                <button
                  className="text-red-600 hover:underline"
                  onClick={() => unassignOne(a.id)}
                >
                  제거
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Manage;
