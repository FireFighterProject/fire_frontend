// src/pages/Manage.tsx

import React, { useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import type { Vehicle } from "../types/global";
import apiClient from "../api/axios";
import { devLog } from "../utils/devLog";
import { buildAppPath } from "../utils/appUrl";
import { fetchVehicles } from "../features/vehicle/vehicleSlice";
import { useVehiclePolling } from "../hooks/useVehiclePolling";
import { isActiveStatus } from "../services/vehicle/status";

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
 * 행 색상 / 편성 가능 행
 * ========================= */
function getRowColor(label: string) {
  if (label.includes("전체")) return "bg-white";
  if (label.includes("대기")) return "bg-green-50";
  if (label.includes("복귀")) return "bg-amber-50";
  if (label.includes("활동")) return "bg-red-50";
  return "bg-gray-50";
}

function isAssignableRowLabel(label: string) {
  return label.includes("대기") || label.includes("복귀");
}






/* =========================
 * 유틸 함수
 * ========================= */
function getStationName(v: Vehicle) {
  return v.station ?? v.stationName ?? "";
}

function getCallname(v: Vehicle) {
  return v.callname ?? v.callSign ?? v.name ?? `V-${v.id}`;
}

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

function isActiveStatusLocal(status?: string): boolean {
  return isActiveStatus(status);
}

function normalizeSido(raw?: string) {
  if (!raw) return "";
  const s = raw.replace(/\s+/g, "");
  if (s === "경북") return "경상북도";
  return s;
}

/* =========================
 * 시·도 명칭 → 소방 표기 변환
 * ========================= */
function convertSidoToFireLabel(sido: string) {
  const map: Record<string, string> = {
    "서울특별시": "서울소방",
    "부산광역시": "부산소방",
    "대구광역시": "대구소방",
    "인천광역시": "인천소방",
    "광주광역시": "광주소방",
    "대전광역시": "대전소방",
    "울산광역시": "울산소방",
    "세종특별자치시": "세종소방",
    "경기도": "경기소방",
    "강원도": "강원소방",
    "충청북도": "충북소방",
    "충청남도": "충남소방",
    "전라북도": "전북소방",
    "전라남도": "전남소방",
    "경상북도": "경북소방",
    "경상남도": "경남소방",
    "제주특별자치도": "제주소방",
  };

  return map[sido] ?? sido; // 혹시 매핑 누락 시 원본 유지
}


//역변환
function convertFireLabelToSido(label: string) {
  const map: Record<string, string> = {
    "서울소방": "서울특별시",
    "부산소방": "부산광역시",
    "대구소방": "대구광역시",
    "인천소방": "인천광역시",
    "광주소방": "광주광역시",
    "대전소방": "대전광역시",
    "울산소방": "울산광역시",
    "세종소방": "세종특별자치시",
    "경기소방": "경기도",
    "강원소방": "강원도",
    "충북소방": "충청북도",
    "충남소방": "충청남도",
    "전북소방": "전라북도",
    "전남소방": "전라남도",
    "경북소방": "경상북도",
    "경남소방": "경상남도",
    "제주소방": "제주특별자치도",
  };

  return map[label] ?? label;
}
/* =========================
 * 표 데이터 구성
 * ========================= */
function buildRows(vehicles: Vehicle[], isDisaster: boolean) {
  type RowType = Record<
    VehicleTypeKey | "구분" | "차량(계)" | "인원(계)",
    string | number
  >;

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
      경펌: 0,
      소펌: 0,
      중펌: 0,
      대펌: 0,
      중형탱크: 0,
      대형탱크: 0,
      급수탱크: 0,
      화학: 0,
      산불: 0,
      험지: 0,
      로젠바우어: 0,
      산불신속팀: 0,
      구조: 0,
      구급: 0,
      지휘: 0,
      조사: 0,
      굴절: 0,
      고가: 0,
      배연: 0,
      회복: 0,
      지원: 0,
      기타: 0,
    };

    subset.forEach((v) => {
      const key = normalizeType(v.type);
      row[key] = (row[key] as number) + 1;
    });

    return row;
  };

  const isGB = (v: Vehicle) =>
    normalizeSido(v.sido) === "경상북도";

  // ★ 시도 표기 변환
  const gbLabel = convertSidoToFireLabel("경상북도");

  if (!isDisaster) {
    rows.push(calcRow(`${gbLabel} 전체`, isGB));
    rows.push(
      calcRow(`${gbLabel} 대기`, (v) => isGB(v) && v.status === "대기")
    );
    rows.push(
      calcRow(`${gbLabel} 복귀중`, (v) => isGB(v) && v.status === "복귀중")
    );
    rows.push(
      calcRow(
        `${gbLabel} 활동`,
        (v) => isGB(v) && isActiveStatusLocal(v.status)
      )
    );

    return rows;
  }

  rows.push(calcRow(`${gbLabel} 전체`, isGB));
  rows.push(
    calcRow(`${gbLabel} 대기`, (v) => isGB(v) && v.status === "대기")
  );
  rows.push(
    calcRow(`${gbLabel} 복귀중`, (v) => isGB(v) && v.status === "복귀중")
  );
  rows.push(
    calcRow(
      `${gbLabel} 활동`,
      (v) => isGB(v) && isActiveStatusLocal(v.status)
    )
  );

  // 나머지 시・도
  const others = Array.from(
    new Set(
      vehicles
        .map((v) => normalizeSido(v.sido))
        .filter((s) => s && s !== "경상북도")
    )
  );

  others.forEach((region) => {
    const regionLabel = convertSidoToFireLabel(region);

    rows.push(
      calcRow(
        `${regionLabel} 전체`,
        (v) => normalizeSido(v.sido) === region
      )
    );
    rows.push(
      calcRow(
        `${regionLabel} 대기`,
        (v) => normalizeSido(v.sido) === region && v.status === "대기"
      )
    );
    rows.push(
      calcRow(
        `${regionLabel} 복귀중`,
        (v) => normalizeSido(v.sido) === region && v.status === "복귀중"
      )
    );
    rows.push(
      calcRow(
        `${regionLabel} 활동`,
        (v) =>
          normalizeSido(v.sido) === region &&
          isActiveStatusLocal(v.status)
      )
    );
  });

  return rows;
}


/* =========================
 * 조건 빌더
 * ========================= */
function buildRowPredicate(label: string) {
  const parts = label.split(" ");
  const statusRaw = parts[parts.length - 1] ?? "";
  const regionRaw = parts.slice(0, -1).join(" ");
  const sidoOriginal = convertFireLabelToSido(regionRaw);

  return (v: Vehicle) => {
    const sido = normalizeSido(v.sido);
    if (sido !== sidoOriginal) return false;
    if (statusRaw === "대기") return v.status === "대기";
    if (statusRaw === "복귀중") return v.status === "복귀중";
    if (statusRaw === "활동") return isActiveStatusLocal(v.status);
    return false;
  };
}


/* =========================
 * 메인 컴포넌트
 * ========================= */
const Manage: React.FC = () => {
  const dispatch = useAppDispatch();
  const isDisaster = useAppSelector((s) => s.emergency.isDisaster);
  const vehicles = useAppSelector((s) => s.vehicle.vehicles) as Vehicle[];
  const vehicleLoading = useAppSelector((s) => s.vehicle.loading);
  const vehicleError = useAppSelector((s) => s.vehicle.error);

  useVehiclePolling();

  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set());
  const [assigned, setAssigned] = useState<
    {
      id: number | string;
      callname: string;
      sido: string;
      station: string;
      type: string;
      status: string;
    }[]
  >([]);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [addr, setAddr] = useState("");

  const [sending, setSending] = useState(false);

  const remaining = useMemo(
    () =>
      vehicles
        .filter((v) => !assignedIds.has(Number(v.id)))
        .sort((a, b) => Number(a.id) - Number(b.id)),
    [vehicles, assignedIds]
  );

  const rows = useMemo(() => buildRows(remaining, isDisaster), [remaining, isDisaster]);

  function handleAssignOne(label: string, key: VehicleTypeKey) {
    if (!isAssignableRowLabel(label)) {
      return alert("대기·복귀중 행의 숫자만 선택할 수 있습니다.");
    }

    const predicate = buildRowPredicate(label);

    const target = remaining.find((v) => predicate(v) && normalizeType(v.type) === key);
    if (!target) return;

    const vid = Number(target.id);
    const statusLabel = target.status === "복귀중" ? "복귀중" : "대기중";
    const labelText =
      `[${statusLabel}] ${getCallname(target)} / ${getStationName(target)} / ${target.type}`;

    if (!window.confirm(`다음 차량을 편성합니다.\n\n${labelText}\n\n계속하시겠습니까?`)) {
      return;
    }

    setAssignedIds((prev) => new Set(prev).add(vid));
    setAssigned((prev) => [
      ...prev,
      {
        id: vid,
        callname: getCallname(target),
        sido: target.sido,
        station: getStationName(target),
        type: target.type,
        status: target.status,
      },
    ]);
  }

  function removeAssigned(id: number) {
    setAssigned((p) => p.filter((a) => Number(a.id) !== id));
    setAssignedIds((p) => {
      const n = new Set(p);
      n.delete(id);
      return n;
    });
  }

  /* ===============================
   * 🚨 문자용 텍스트 생성
    * =============================== */
  function buildSmsText(
    v: { id: number | string },
    missionId: number
  ) {
    const link = buildAppPath(`/gps/ready?missionId=${missionId}&vehicle=${v.id}`);

    return `출동요청 출동링크: ${link}`;
  }



  async function sendSms(vehicleId: string | number, text: string) {
    const vehicle = vehicles.find((v) => Number(v.id) === Number(vehicleId));
    const contact = vehicle?.contact?.replace(/\D/g, "") ?? "";

    if (!contact) {
      devLog("문자 발송 생략 — 연락처 없음", { vehicleId });
      return { skipped: true, reason: "no_contact" };
    }

    devLog("문자 발송 요청(POST)", { vehicleId, text });

    return apiClient.post("/sms/to-vehicle", {
      vehicleId,
      text,
    });
  }


  /* ===============================
   * 출동 생성 + 차량 배치 + 문자 자동 발송
   * =============================== */
  async function handleCreateSend() {
    if (!title.trim() || !addr.trim() || !desc.trim()) {
      return alert("출동 정보가 부족합니다.");
    }
    if (assigned.length === 0) return alert("편성된 차량이 없습니다.");

    try {
      setSending(true);

      // 1) 출동 생성
      const res = await apiClient.post("/dispatch-orders", {
        title,
        address: addr,
        content: desc,
      });

      const missionId = res.data.id;

      // 2) 편성 차량 등록
      await apiClient.post(`/dispatch-orders/${missionId}/assign`, {
        vehicleIds: assigned.map((v) => v.id),
      });

      // 3) 문자 발송 — 실패해도 나머지 계속 발송
      const smsResults = await Promise.allSettled(
        assigned.map((v) => sendSms(v.id, buildSmsText(v, missionId)))
      );

      const smsSkipped = smsResults.filter(
        (r) => r.status === "fulfilled" && (r.value as { skipped?: boolean })?.skipped
      ).length;
      const smsFailed = smsResults.filter((r) => r.status === "rejected").length;
      const smsSent = assigned.length - smsFailed - smsSkipped;

      if (smsFailed > 0 || smsSkipped > 0) {
        alert(
          `출동 생성 완료\n\n` +
          `문자 발송: 성공 ${smsSent}건` +
          (smsSkipped > 0 ? ` / 연락처 없음 ${smsSkipped}건` : "") +
          (smsFailed > 0 ? ` / 실패 ${smsFailed}건` : "") +
          `\n실패·연락처 없음 차량은 수동으로 재발송해 주세요.`
        );
      } else {
        alert("출동 생성 + 문자 발송 완료!");
      }

      dispatch(fetchVehicles({}));
      setAssigned([]);
      setAssignedIds(new Set());
      setTitle("");
      setDesc("");
      setAddr("");

    } catch (e: unknown) {
      console.error(e);
      const msg =
        e &&
        typeof e === "object" &&
        "response" in e &&
        (e as { response?: { data?: { message?: string } } }).response?.data?.message;

      if (typeof msg === "string" && msg.includes("전송 대상")) {
        console.warn("SMS 검증 메시지(알림 생략):", msg);
        alert("출동은 생성되었으나 일부 문자 발송 설정을 확인해 주세요.");
        return;
      }

      alert(typeof msg === "string" && msg ? msg : "출동 생성 / 문자 발송 중 오류 발생");
    } finally {
      setSending(false);
    }
  }

  /* ===============================
   * UI
   * =============================== */
  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* 출동 편성 표 */}
      <section className="p-4 overflow-x-auto">
        <div className="mb-2">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-red-500 font-semibold">
              출동 편성: 녹색(대기)·노란색(복귀중) 행의 숫자 클릭
            </h1>
            <span className="text-xs text-gray-500 shrink-0">
              {vehicleLoading ? "차량 목록 갱신 중…" : "15초마다 자동 갱신"}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            대기 = 자원집결지 대기 차량 · 복귀중 = 임무 후 집결지로 복귀 중인 차량
          </p>
        </div>
        {vehicleError && (
          <p className="mb-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            최신 차량 목록을 불러오지 못했습니다. 마지막 데이터를 표시합니다. ({vehicleError})
          </p>
        )}
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
                className={getRowColor(String(r["구분"]))}   // ⭐ 지역별 색상 적용 코드
              >
                <td className="border px-2 py-1 text-left font-medium">{r["구분"]}</td>
                <td className="border px-2 py-1 text-center">{r["차량(계)"]}</td>
                <td className="border px-2 py-1 text-center">{r["인원(계)"]}</td>

                {COL_ORDER.map((k) => {
                  const val = r[k];
                  const rowLabel = String(r["구분"]);
                  const isAssignableRow = isAssignableRowLabel(rowLabel);
                  const canClick =
                    typeof val === "number" && val > 0 && isAssignableRow;

                  return (
                    <td
                      key={k}
                      className={
                        "border px-2 py-1 text-center select-none " +
                        (canClick
                          ? [
                            "cursor-pointer font-semibold",
                            rowLabel.includes("복귀")
                              ? "bg-gradient-to-b from-amber-50 to-amber-200 border-amber-400"
                              : "bg-gradient-to-b from-blue-50 to-blue-200 border-blue-400",
                            "shadow-[0_2px_4px_rgba(0,0,0,0.2)]",
                            rowLabel.includes("복귀")
                              ? "hover:from-amber-100 hover:to-amber-300"
                              : "hover:from-blue-100 hover:to-blue-300",
                            "hover:shadow-lg",
                            "active:translate-y-[1px] active:shadow-none",
                            "transition-all duration-150 ease-out",
                          ].join(" ")
                          : isAssignableRow
                            ? "font-bold"
                            : "text-gray-400"
                        )
                      }
                      onClick={() => canClick && handleAssignOne(rowLabel, k)}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* 출동 정보 입력 - 항상 표시 */}
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

          {/* 편성된 차량 목록 - 차량이 있을 때만 표시 */}
          {assigned.length > 0 && (
            <ul className="space-y-2">
              {assigned.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between border rounded px-3 py-2 bg-white gap-2"
                >
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span
                      className={
                        "shrink-0 text-xs font-bold px-2 py-0.5 rounded " +
                        (a.status === "복귀중"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-green-100 text-green-800 border border-green-300")
                      }
                    >
                      {a.status === "복귀중" ? "복귀중" : "대기중"}
                    </span>
                    <span className="text-sm truncate">
                      {a.callname} / {a.sido} {a.station} / {a.type}
                    </span>
                  </div>

                  <button
                    onClick={() => removeAssigned(Number(a.id))}
                    className="shrink-0 px-2 py-1 bg-red-500 text-white text-xs rounded"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* 제출 버튼 */}
          <button
            onClick={handleCreateSend}
            disabled={sending || assigned.length === 0}
            className={
              "w-full py-3 mt-3 rounded text-white " +
              (sending || assigned.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700")
            }
          >
            {sending ? "발송중..." : assigned.length === 0 ? "차량을 편성해주세요" : "출동 생성 및 발송"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default Manage;
