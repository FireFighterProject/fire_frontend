// src/pages/Manage.tsx

import React, { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
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
  return (v as any).station ?? (v as any).stationName ?? "";
}
function getCallname(v: Vehicle) {
  const vv = v as any;
  return vv.callname ?? vv.callSign ?? vv.name ?? `V-${vv.id}`;
}
function isRally(v: Vehicle) {
  return (v as any).rally === true || (v as any).rallyPoint === 1;
}
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
  if (t.includes("조사")) return "조사";
  if (t.includes("지휘")) return "지휘";
  if (t.includes("굴절")) return "굴절";
  if (t.includes("고가")) return "고가";
  return "기타";
}
function normalizeStatus(status: string | undefined): "대기" | "활동" {
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

function buildRows(vehicles: Vehicle[], isDisaster: boolean) {
  const rows: any[] = [];

  const calcRow = (label: string, cond: (v: Vehicle) => boolean) => {
    const subset = vehicles.filter(cond);

    const row: any = {
      구분: label,
      "차량(계)": subset.length,
      "인원(계)": subset.reduce((s, v) => s + (Number((v as any).personnel) || 0), 0),
      경펌: 0, 소펌: 0, 중펌: 0, 대펌: 0,
      중형탱크: 0, 대형탱크: 0, 급수탱크: 0,
      화학: 0, 산불: 0, 험지: 0, 로젠바우어: 0, 산불신속팀: 0,
      구조: 0, 구급: 0, 지휘: 0, 조사: 0,
      굴절: 0, 고가: 0, 배연: 0, 회복: 0, 지원: 0, 기타: 0,
    };

    subset.forEach((v) => {
      const key = normalizeType((v as any).type);
      row[key] += 1;
    });

    return row;
  };

  // 평상시 → 경상북도만 표시
  if (!isDisaster) {
    rows.push(calcRow("경상북도 전체", (v) => normalizeSido((v as any).sido) === "경상북도"));
    return rows;
  }

  // 재난 시: 경상북도 먼저 고정
  const isGB = (v: Vehicle) => normalizeSido((v as any).sido) === "경상북도";

  rows.push(calcRow("경상북도 전체", (v) => isGB(v) && isRally(v)));
  rows.push(calcRow("경상북도 대기", (v) => isGB(v) && isRally(v) && normalizeStatus((v as any).status) === "대기"));
  rows.push(calcRow("경상북도 활동", (v) => isGB(v) && isRally(v) && normalizeStatus((v as any).status) === "활동"));

  // 나머지 지역 추출 (경상북도 제외)
  const other = Array.from(
    new Set(
      vehicles
        .map((v) => normalizeSido((v as any).sido))
        .filter((s) => s && s !== "경상북도")
    )
  );

  other.forEach((region) => {
    rows.push(calcRow(`${region} 전체`, (v) => normalizeSido((v as any).sido) === region));
    rows.push(calcRow(`${region} 대기`, (v) => normalizeSido((v as any).sido) === region && normalizeStatus((v as any).status) === "대기"));
    rows.push(calcRow(`${region} 활동`, (v) => normalizeSido((v as any).sido) === region && normalizeStatus((v as any).status) === "활동"));
  });

  return rows;
}


/* =========================
 * 조건 빌더
 * ========================= */
function buildRowPredicate(label: string, isDisaster: boolean) {
  const [regionRaw, statusRaw] = label.split(" ");
  const wantsWait = statusRaw === "대기";

  return (v: Vehicle) => {
    const sido = (v as any).sido ?? "";
    const status = normalizeStatus((v as any).status);

    if (regionRaw === "경북") {
      if (sido !== "경북") return false;
      if (isDisaster && !isRally(v)) return false;
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
  const dispatch = useDispatch<any>();

  const isDisaster = useSelector((s: RootState) => s.emergency.isDisaster);
  const vehicles = useSelector((s: RootState) => s.vehicle.vehicles) as Vehicle[];

  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set());
  const [assigned, setAssigned] = useState<any[]>([]);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [addr, setAddr] = useState("");

  /* 선택되지 않은 차량 목록 */
  const remaining = useMemo(
    () => vehicles.filter((v) => !assignedIds.has((v as any).id)),
    [vehicles, assignedIds]
  );

  const rows = useMemo(
    () => buildRows(remaining, isDisaster),
    [remaining, isDisaster]
  );

  /* =========================
   * 차량 선택 (대기만 허용)
   * ========================= */
  function handleAssignOne(rowLabel: string, typeKey: VehicleTypeKey) {
    if (!rowLabel.includes("대기")) {
      alert("대기 차량만 선택할 수 있습니다.");
      return;
    }

    const predicate = buildRowPredicate(rowLabel, isDisaster);

    const target = remaining.find(
      (v) => predicate(v) && normalizeType((v as any).type) === typeKey
    );

    if (!target) return;

    const vid = (target as any).id;

    setAssignedIds((prev) => new Set(prev).add(vid));

    setAssigned((prev) => [
      ...prev,
      {
        id: vid,
        callname: getCallname(target),
        sido: (target as any).sido,
        station: getStationName(target),
        type: (target as any).type,
      },
    ]);
  }

  /* =========================
   * 편성 차량 삭제
   * ========================= */
  function removeAssigned(id: number) {
    setAssigned((prev) => prev.filter((a) => a.id !== id));
    setAssignedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  /* =========================
   * 출동 생성 + 발송 (새 API 구조)
   * ========================= */
  async function handleCreateSend() {
    if (!title.trim()) return alert("출동 제목을 입력하세요.");

    try {
      // 1) 출동 생성 (차량 정보 포함 X)
      const res = await api.post("/dispatch-orders", {
        stationId: 1,
        title,
        description: desc,
        address: addr,
        addressNormalized: addr,
        latitude: 0,
        longitude: 0,
      });

      const orderId = res.data.dispatchOrderId;

      // 2) 출동 발송
      await api.post(`/dispatch-orders/${orderId}/send`);

      alert("출동 생성 및 발송 완료");

      // 테이블 즉시 갱신
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
  // 전국 17개 시·도 이름 (표준)
  const REGION_LIST = [
    "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
    "대전광역시", "울산광역시", "세종특별자치시",
    "경기도", "강원도", "충청북도", "충청남도",
    "전라북도", "전라남도",
    "경상북도", "경상남도",
    "제주특별자치도",
  ];

  // 반복할 3색상
  const REGION_COLORS = [
    "bg-red-50",
    "bg-blue-50",
    "bg-green-50",
  ];

  // label 문자열에 포함된 지역명 찾기
  function detectRegion(label: string) {
    return REGION_LIST.find((region) => label.includes(region));
  }

  // 색상 가져오기
  function getRowColor(label: string) {
    const region = detectRegion(label);
    if (!region) return "bg-gray-50"; // 지역 없음 → 기본값

    const index = REGION_LIST.indexOf(region);
    const color = REGION_COLORS[index % REGION_COLORS.length];

    return color;
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
                key={r["구분"] + idx}
                className={`${getRowColor(r["구분"])} ${idx % 2 ? "opacity-95" : ""}`}
              >
                <td className="border px-2 py-1 text-left font-medium">{r["구분"]}</td>
                <td className="border px-2 py-1 text-center">{r["차량(계)"]}</td>
                <td className="border px-2 py-1 text-center">{r["인원(계)"]}</td>

                {COL_ORDER.map((k) => {
                  const val = r[k];
                  const canClick = val > 0 && r["구분"].includes("대기");

                  return (
                    <td
                      key={k}
                      className={
                        "border px-2 py-1 text-center select-none " +
                        (canClick ? "cursor-pointer hover:bg-blue-100" : "text-gray-400")
                      }
                      onClick={() => canClick && handleAssignOne(r["구분"], k)}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* =========================
            편성 차량 화면
        ========================= */}
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
                    onClick={() => removeAssigned(a.id)}
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
