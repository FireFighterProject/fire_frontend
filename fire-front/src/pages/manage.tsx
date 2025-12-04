// src/pages/Manage.tsx

import React, { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import type { RootState } from "../store";
import type { Vehicle } from "../types/global";
import axios from "axios";
import { fetchVehicles } from "../features/vehicle/vehicleSlice";

const API_BASE = "http://172.28.5.94:8081";
const api = axios.create({ baseURL: `${API_BASE}/api` });

/* =========================
 * 타입 키
 * ========================= */
type VehicleTypeKey =
  | "경펌" | "소펌" | "중펌" | "대펌"
  | "중형탱크" | "대형탱크" | "급수탱크"
  | "화학" | "산불" | "험지"
  | "로젠바우어" | "산불신속팀"
  | "구조" | "구급" | "지휘" | "조사"
  | "굴절" | "고가" | "배연"
  | "회복" | "지원" | "기타";

const COL_ORDER: VehicleTypeKey[] = [
  "경펌", "소펌", "중펌", "대펌",
  "중형탱크", "대형탱크", "급수탱크",
  "화학", "산불", "험지", "로젠바우어", "산불신속팀",
  "구조", "구급", "지휘", "조사",
  "굴절", "고가", "배연", "회복", "지원", "기타",
];

/* =========================
 * 유틸 함수
 * ========================= */
function getStationName(v: Vehicle) {
  return v.station ?? v.stationName ?? "";
}

function getCallname(v: Vehicle) {
  return v.callname ?? v.callSign ?? v.name ?? `V-${v.id}`;
}

// function isRally(v: Vehicle) {
//   return v.rally === true || v.rallyPoint === 1;
// }

function normalizeType(type?: string): VehicleTypeKey {
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
  if (t.includes("조사")) return "조사";
  if (t.includes("지휘")) return "지휘";
  if (t.includes("굴절")) return "굴절";
  if (t.includes("고가")) return "고가";
  return "기타";
}

function normalizeStatus(status?: string): "대기" | "활동" {
  const s = status ?? "";
  if (s.includes("활동") || s.includes("출동") || s.includes("임무")) return "활동";
  return "대기";
}

/* =========================
 * 경상북도 경북 매칭/표 구성
 * ========================= */
function normalizeSido(raw?: string) {
  if (!raw) return "";
  const s = raw.replace(/\s+/g, "");
  if (s === "경북") return "경상북도";
  return s;
}

/* =========================
 * 표 데이터 구성
 * ========================= */
function buildRows(vehicles: Vehicle[], isDisaster: boolean) {
  type RowType = Record<VehicleTypeKey | "구분" | "차량(계)" | "인원(계)", string | number>;

  const rows: RowType[] = [];

  const calcRow = (label: string, cond: (v: Vehicle) => boolean): RowType => {
    const subset = vehicles.filter(cond);

    const row: RowType = {
      구분: label,
      "차량(계)": subset.length,
      "인원(계)": subset.reduce(
        (s, v) => s + (Number(v.personnel) || 0),
        0
      ),
      경펌: 0, 소펌: 0, 중펌: 0, 대펌: 0,
      중형탱크: 0, 대형탱크: 0, 급수탱크: 0,
      화학: 0, 산불: 0, 험지: 0, 로젠바우어: 0, 산불신속팀: 0,
      구조: 0, 구급: 0, 지휘: 0, 조사: 0,
      굴절: 0, 고가: 0, 배연: 0, 회복: 0, 지원: 0, 기타: 0,
    };

    subset.forEach((v) => {
      const key = normalizeType(v.type);
      row[key] = (typeof row[key] === "number" ? row[key] : 0) + 1;
    });

    return row;
  };

  // 평상시
  if (!isDisaster) {
    const isGB = (v: Vehicle) => normalizeSido(v.sido) === "경상북도";

    rows.push(calcRow("경상북도 전체", isGB));
    rows.push(calcRow("경상북도 대기", (v) => isGB(v) && normalizeStatus(v.status) === "대기"));
    rows.push(calcRow("경상북도 활동", (v) => isGB(v) && normalizeStatus(v.status) === "활동"));

    return rows;
  }

  // 재난 시: 경북 먼저
  const isGB = (v: Vehicle) => normalizeSido(v.sido) === "경상북도";

  // rows.push(calcRow("경상북도 전체", (v) => isGB(v) && isRally(v)));
  // rows.push(calcRow("경상북도 대기", (v) => isGB(v) && isRally(v) && normalizeStatus(v.status) === "대기"));
  // rows.push(calcRow("경상북도 활동", (v) => isGB(v) && isRally(v) && normalizeStatus(v.status) === "활동"));

  // 재난모드에서도 경북 차량 모두 포함
  rows.push(calcRow("경상북도 전체", (v) => isGB(v)));
  rows.push(calcRow("경상북도 대기", (v) => isGB(v) && normalizeStatus(v.status) === "대기"));
  rows.push(calcRow("경상북도 활동", (v) => isGB(v) && normalizeStatus(v.status) === "활동"));


  // 나머지 지역
  const otherRegions = Array.from(
    new Set(
      vehicles
        .map((v) => normalizeSido(v.sido))
        .filter((s) => s && s !== "경상북도")
    )
  );

  otherRegions.forEach((region) => {
    rows.push(calcRow(`${region} 전체`, (v) => normalizeSido(v.sido) === region));
    rows.push(calcRow(`${region} 대기`, (v) => normalizeSido(v.sido) === region && normalizeStatus(v.status) === "대기"));
    rows.push(calcRow(`${region} 활동`, (v) => normalizeSido(v.sido) === region && normalizeStatus(v.status) === "활동"));
  });

  return rows;
}

/* =========================
 * 조건 빌더
 * ========================= */
function buildRowPredicate(label: string) {
  const [regionRaw, statusRaw] = label.split(" ");
  const wantsWait = statusRaw === "대기";

  return (v: Vehicle) => {
    const sido = v.sido ?? "";
    const status = normalizeStatus(v.status);

    const isGBRow = regionRaw === "경북" || regionRaw === "경상북도";

    if (isGBRow) {
      if (!["경북", "경상북도"].includes(sido)) return false;
      // if (isDisaster && !isRally(v)) return false;
    } else {
      if (sido !== regionRaw) return false;
    }

    if (wantsWait && status !== "대기") return false;
    return true;
  };
}

/* =========================
 * 메인 컴포넌트
 * ========================= */
const Manage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const isDisaster = useSelector((s: RootState) => s.emergency.isDisaster);
  const vehicles = useSelector((s: RootState) => s.vehicle.vehicles) as Vehicle[];

  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set());
  const [assigned, setAssigned] = useState<
    { id: number | string; callname: string; sido: string; station: string; type: string }[]
  >([]);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [addr, setAddr] = useState("");

  const remaining = useMemo(
    () => vehicles.filter((v) => !assignedIds.has(Number(v.id))),
    [vehicles, assignedIds]
  );

  const rows = useMemo(
    () => buildRows(remaining, isDisaster),
    [remaining, isDisaster]
  );

  /* 차량 선택 */
  function handleAssignOne(rowLabel: string, typeKey: VehicleTypeKey) {
    if (!rowLabel.includes("대기")) {
      alert("대기 차량만 선택할 수 있습니다.");
      return;
    }

    const predicate = buildRowPredicate(rowLabel,);

    const target = remaining.find(
      (v) => predicate(v) && normalizeType(v.type) === typeKey
    );

    if (!target) return;

    const vid = Number(target.id);

    setAssignedIds((prev) => new Set(prev).add(vid));

    setAssigned((prev) => [
      ...prev,
      {
        id: vid,
        callname: getCallname(target),
        sido: target.sido,
        station: getStationName(target),
        type: target.type,
      },
    ]);
  }

  /* 편성 차량 삭제 */
  function removeAssigned(id: number) {
    setAssigned((prev) => prev.filter((a) => Number(a.id) !== id));
    setAssignedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  /* 출동 생성 + 차량 편성 */
  async function handleCreateSend() {
    if (!title.trim()) return alert("출동 제목을 입력하세요.");
    if (!addr.trim()) return alert("주소를 입력하세요.");
    if (!desc.trim()) return alert("내용을 입력하세요.");
    if (assigned.length === 0) return alert("편성된 차량이 없습니다.");

    try {
      const createRes = await api.post("/dispatch-orders", {
        title,
        address: addr,
        content: desc,
      });

      const orderId = createRes.data.id;

      await api.post(`/dispatch-orders/${orderId}/assign`, {
        vehicleIds: assigned.map((v) => v.id),
      });

      alert("출동 생성 및 차량 편성 완료!");

      dispatch(fetchVehicles({}));

      setAssigned([]);
      setAssignedIds(new Set());
      setTitle("");
      setDesc("");
      setAddr("");

    } catch (e) {
      console.error(e);
      alert("출동 생성 실패");
    }
  }

  /* 지역 색상 */
  const REGION_LIST = [
    "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
    "대전광역시", "울산광역시", "세종특별자치시",
    "경기도", "강원도", "충청북도", "충청남도",
    "전라북도", "전라남도",
    "경상북도", "경상남도",
    "제주특별자치도",
  ];
  const REGION_COLORS = ["bg-red-50", "bg-blue-50", "bg-green-50"];

  function detectRegion(label: string) {
    return REGION_LIST.find((region) => label.includes(region));
  }

  function getRowColor(label: string) {
    const region = detectRegion(label);
    if (!region) return "bg-gray-50";

    const index = REGION_LIST.indexOf(region);
    return REGION_COLORS[index % REGION_COLORS.length];
  }

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <section className="p-4 overflow-x-auto">
        <table className="table-auto w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">구분</th>
              <th className="border px-2 py-1">차량(계)</th>
              <th className="border px-2 py-1">인원(계)</th>

              {COL_ORDER.map((c) => (
                <th key={c} className="border px-2 py-1">{c}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={`${r["구분"]}${idx}`}
                className={`${getRowColor(String(r["구분"]))} ${idx % 2 ? "opacity-95" : ""}`}
              >
                <td className="border px-2 py-1 text-left font-medium">{r["구분"]}</td>
                <td className="border px-2 py-1 text-center">{r["차량(계)"]}</td>
                <td className="border px-2 py-1 text-center">{r["인원(계)"]}</td>

                {COL_ORDER.map((k) => {
                  const val = r[k];
                  const canClick = typeof val === "number" && val > 0 && String(r["구분"]).includes("대기");

                  return (
                    <td
                      key={k}
                      className={
                        "border px-2 py-1 text-center select-none " +
                        (canClick ? "cursor-pointer hover:bg-blue-100" : "text-gray-400")
                      }
                      onClick={() => canClick && handleAssignOne(String(r["구분"]), k)}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {assigned.length > 0 && (
          <div className="mt-6 space-y-3">
            <input
              placeholder="출동 제목"
              className="w-full border px-3 py-2 rounded"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              placeholder="출동 내용"
              className="w-full border px-3 py-2 rounded h-24"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />

            <input
              placeholder="출동 주소"
              className="w-full border px-3 py-2 rounded"
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
            />

            <h4 className="font-semibold mt-4">편성 차량</h4>
            <ul className="space-y-2">
              {assigned.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between border rounded px-3 py-2 bg-white"
                >
                  <div>{a.callname} / {a.sido} {a.station} / {a.type}</div>

                  <button
                    onClick={() => removeAssigned(Number(a.id))}
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>

            <button
              onClick={handleCreateSend}
              className="w-full py-3 mt-3 bg-green-600 text-white rounded"
            >
              출동 생성 및 발송
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Manage;
