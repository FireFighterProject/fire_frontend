// src/pages/Dispatch.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import KakaoMapModal from "../components/Dispatch/KakaoMapModal";
import type { RootState, AppDispatch } from "../store";
import { setVehicles, updateVehicle } from "../features/vehicle/vehicleSlice";
import type { Vehicle } from "../types/global";
import axios from "axios";

/** 서버 응답 스키마 (목록 아이템) */
type ApiVehicleListItem = {
  id: number;
  stationId: number;
  sido: string;
  typeName: string;
  callSign: string;
  status: number;      // 0=대기, 1=활동, 2=철수
  rallyPoint: number;  // 0/1
  capacity?: number;
  personnel?: number;
  avlNumber?: string;
  psLteNumber?: string;
};

/** 상태코드 ↔ 라벨 변환 */
const STATUS_LABELS: Record<number, Vehicle["status"] | string> = {
  0: "대기",
  1: "출동중",  // 서버의 "활동"을 UI에서는 "출동중"으로 표기
  2: "철수",
};
const LABEL_TO_STATUS: Record<string, number> = {
  대기: 0,
  활동: 1,
  출동중: 1,
  철수: 2,
};

/** 공용 axios */
const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

/** API → UI Vehicle 매핑 (기존 테이블 컬럼에 맞춤) */
const mapApiToVehicle = (v: ApiVehicleListItem): Vehicle => {
  const statusLabel = STATUS_LABELS[v.status] ?? String(v.status);
  return {
    id: String(v.id),
    sido: v.sido ?? "",
    station: "", // 서버 응답에 소방서명 없음 → 필요 시 fire-stations로 조인
    type: v.typeName ?? "",
    callname: v.callSign ?? "",
    capacity: Number.isFinite(v.capacity as number) ? (v.capacity as number) : 0,
    personnel: Number.isFinite(v.personnel as number) ? (v.personnel as number) : 0,
    avl: v.avlNumber ?? "",
    pslte: v.psLteNumber ?? "",
    status: statusLabel as Vehicle["status"],
    rally: v.rallyPoint === 1,

    // 지도/출동 모달 관련 로컬 필드
    dispatchPlace: "",
    lat: undefined,
    lng: undefined,
    contact: "",
    content: "",
  } as Vehicle;
};

const Dispatch: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const vehicles = useSelector((s: RootState) => s.vehicle.vehicles);

  // --- 로컬 UI 상태 ---
  const [fetching, setFetching] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [content, setContent] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  // 차량 목록 조회
  const fetchVehicles = async (params?: {
    stationId?: number;
    status?: number;
    typeName?: string;
    callSign?: string;
  }) => {
    try {
      setFetching(true);
      const res = await api.get<ApiVehicleListItem[]>("/vehicles", { params });
      const mapped = (res.data ?? []).map(mapApiToVehicle);
      dispatch(setVehicles(mapped));
      setSelected([]); // 새로고침 시 선택 초기화
    } catch (e) {
      console.error(e);
      alert("차량 목록을 불러오지 못했습니다.");
    } finally {
      setFetching(false);
    }
  };

  // 최초 1회 조회
  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  // ✅ 선택 차량 '출동중'으로 실제 API PATCH + 로컬 스토어 업데이트
  const handleDispatch = async () => {
    if (!address || !pos) {
      alert("지도로 출동지를 선택해 주소와 좌표를 지정하세요.");
      return;
    }
    if (selected.length === 0) return;

    setDispatching(true);
    try {
      // 서버 상태코드: 1 = 활동(=UI '출동중')
      const targetStatus = LABEL_TO_STATUS["출동중"]; // 1

      const results = await Promise.allSettled(
        selected.map((id) =>
          api.patch(`/vehicles/${id}/status`, { status: targetStatus })
        )
      );

      // 성공한 차량만 로컬 업데이트
      const succeededIds: string[] = [];
      const failedIds: string[] = [];

      results.forEach((r, idx) => {
        const id = selected[idx];
        if (r.status === "fulfilled") {
          succeededIds.push(id);
          dispatch(
            updateVehicle({
              id,
              patch: {
                status: "출동중" as Vehicle["status"],
                dispatchPlace: address,
                lat: pos.lat,
                lng: pos.lng,
                contact,
                content,
              },
            })
          );
        } else {
          failedIds.push(id);
          console.error("출동 PATCH 실패:", id, r.reason);
        }
      });

      if (failedIds.length > 0) {
        alert(
          `일부 차량 출동 처리 실패:\n성공=${succeededIds.join(", ") || "-"}\n실패=${failedIds.join(", ")}`
        );
      } else {
        alert(`출동 처리 완료: ${succeededIds.join(", ")}`);
      }

      // 서버가 진실원 → 최신 상태 동기화
      await fetchVehicles();
    } finally {
      setDispatching(false);
      // 입력/선택 초기화
      setSelected([]);
      setAddress("");
      setContact("");
      setContent("");
      setPos(null);
      setShowModal(false);
    }
  };

  const sortedVehicles = useMemo(() => {
    return [...vehicles].sort((a, b) => {
      const A = a.status === "출동중";
      const B = b.status === "출동중";
      if (A && !B) return -1;
      if (!A && B) return 1;
      return 0;
    });
  }, [vehicles]);

  return (
    <div className="p-6">
      {/* 상단 버튼
      <div className="mb-4 flex gap-2">
        <button
          className="px-4 py-2 bg-gray-600 text-white rounded disabled:opacity-60"
          onClick={() => fetchVehicles()}
          disabled={fetching}
          title="서버에서 최신 목록 재조회"
        >
          {fetching ? "불러오는 중..." : "새로고침"}
        </button>
        <button
          className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-60"
          onClick={() => setShowModal(true)}
          disabled={selected.length === 0}
          title={selected.length === 0 ? "차량을 선택하세요" : "선택차량 출동 명령"}
        >
          선택차량 출동
        </button>
      </div> */}

      {/* 차량 테이블 */}
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-[1200px] w-full table-fixed border border-gray-300 border-collapse text-sm">
          <colgroup>
            {/* <col className="w-[56px]" /> */}
            <col className="w-[64px]" />
            <col className="w-[88px]" />
            <col className="w-[180px]" />
            <col className="w-[100px]" />
            <col className="w-[140px]" />
            <col className="w-[80px]" />
            <col className="w-[72px]" />
            <col className="w-[170px]" />
            <col className="w-[170px]" />
            <col className="w-[96px]" />
            <col className="w-[96px]" />
          </colgroup>

          <thead className="bg-gray-100">
            <tr>
              {[
                // "선택",
                "연번",
                "시도",
                "소방서",
                "차종",
                "호출명",
                "용량",
                "인원",
                "AVL",
                "PS-LTE",
                "상태",
                "자원집결지",
              ].map((h) => (
                <th key={h} className="border border-gray-300 px-2 py-2 text-center font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sortedVehicles.map((v, ) => (
              <tr key={v.id} className="even:bg-gray-50">
                <td className="border px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(v.id)}
                    onChange={() => toggleSelect(v.id)}
                    disabled={v.status === "출동중"} // 출동중은 선택 비활성화(예시)
                  />
                </td>
                {/* <td className="border px-2 py-1 text-center tabular-nums">{i + 1}</td> */}
                <td className="border px-2 py-1 text-center whitespace-nowrap">{v.sido}</td>
                <td className="border px-2 py-1 whitespace-nowrap">{v.station}</td>
                <td className="border px-2 py-1 text-center whitespace-nowrap">{v.type}</td>
                <td className="border px-2 py-1 whitespace-nowrap">{v.callname}</td>
                <td className="border px-2 py-1 text-right tabular-nums">{Number(v.capacity).toLocaleString()}</td>
                <td className="border px-2 py-1 text-center tabular-nums">{Number(v.personnel)}</td>
                <td className="border px-2 py-1 whitespace-nowrap font-mono">{v.avl}</td>
                <td className="border px-2 py-1 whitespace-nowrap font-mono">{v.pslte}</td>
                <td className={`border px-2 py-1 text-center ${v.status === "출동중" ? "text-red-600 font-semibold" : ""}`}>
                  {v.status}
                </td>
                <td className="border px-2 py-1 text-center">{v.rally ? "O" : "X"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 출동 명령 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-96">
            <h2 className="text-lg font-bold mb-4">출동 명령 작성</h2>

            {/* 주소 */}
            <div className="mb-2">
              <label className="block">주소:</label>
              <div className="flex gap-2">
                <input
                  className="border p-1 flex-1"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="출동지 주소를 입력하거나 MAP으로 선택"
                />
                <button
                  className="px-2 py-1 border rounded"
                  onClick={() => setMapOpen(true)}
                  title="지도로 주소 선택"
                >
                  MAP
                </button>
              </div>
              {pos && (
                <div className="mt-1 text-xs text-gray-600">
                  좌표: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                </div>
              )}
            </div>

            {/* 연락처 */}
            <div className="mb-2">
              <label className="block">연락처:</label>
              <input
                className="border p-1 w-full"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="현장 연락처"
              />
            </div>

            {/* 내용 */}
            <div className="mb-2">
              <label className="block">내용:</label>
              <textarea
                className="border p-1 w-full"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="지시사항/특이사항"
              />
            </div>

            {/* 액션 */}
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 bg-green-500 text-white rounded disabled:opacity-60"
                onClick={handleDispatch}
                disabled={dispatching}
              >
                {dispatching ? "처리 중..." : "출동"}
              </button>
              <button
                className="px-3 py-1 bg-red-500 text-white rounded"
                onClick={() => setShowModal(false)}
                disabled={dispatching}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 카카오맵 모달 */}
      {mapOpen && (
        <KakaoMapModal
          onSelect={({ address, lat, lng }) => {
            setAddress(address);
            setPos({ lat, lng });
            setMapOpen(false);
          }}
          onClose={() => setMapOpen(false)}
        />
      )}
    </div>
  );
};

export default Dispatch;
