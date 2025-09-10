// src/pages/Dispatch.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import KakaoMapModal from "../components/Dispatch/KakaoMapModal";
import { DUMMY_VEHICLES } from "../data/vehicles";
import type { RootState, AppDispatch } from "../store";
import { setVehicles, updateVehicle } from "../features/vehicle/vehicleSlice";
import type { Vehicle } from "../types/global";

const Dispatch: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const vehicles = useSelector((s: RootState) => s.vehicle.vehicles);

  useEffect(() => {
    if (vehicles.length === 0) {
      dispatch(setVehicles(DUMMY_VEHICLES));
    }
  }, [vehicles.length, dispatch]);

  // --- 로컬 UI 상태 ---
  const [selected, setSelected] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [content, setContent] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null); // ✅ 좌표 상태 추가

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  // ✅ 선택 차량들을 '활동'으로 상태 변경 + 주소/좌표 기록
  // ✅ 선택 차량들을 '출동중'으로 상태 변경 + 주소/좌표/연락처/내용 기록
  const handleDispatch = () => {
    if (!address || !pos) {
      alert("지도로 출동지를 선택해 주소와 좌표를 지정하세요.");
      return;
    }

    selected.forEach((id) =>
      dispatch(
        updateVehicle({
          id,
          patch: {
            status: "출동중" as Vehicle["status"],
            dispatchPlace: address,
            lat: pos.lat,
            lng: pos.lng,
            contact,   // ✅ 저장
            content,   // ✅ 저장
          },
        })
      )
    );

    // 입력/선택 초기화
    setSelected([]);
    setAddress("");
    setContact("");
    setContent("");
    setPos(null);
    setShowModal(false);
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
      {/* 상단 버튼 */}
      <div className="mb-4 flex gap-2">
        <button
          className="px-4 py-2 bg-red-500 text-white rounded"
          onClick={() => setShowModal(true)}
          disabled={selected.length === 0}
          title={selected.length === 0 ? "차량을 선택하세요" : "선택차량 출동 명령"}
        >
          선택차량 출동
        </button>
      </div>

      {/* 차량 테이블 */}
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-[1200px] w-full table-fixed border border-gray-300 border-collapse text-sm">
          <colgroup>
            <col className="w-[56px]" />
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
                "선택",
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
            {sortedVehicles.map((v, i) => (
              <tr key={v.id} className="even:bg-gray-50">
                <td className="border px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(v.id)}
                    onChange={() => toggleSelect(v.id)}
                    disabled={v.status === "출동중"} // 출동중은 선택 비활성화(예시)
                  />
                </td>
                <td className="border px-2 py-1 text-center tabular-nums">{i + 1}</td>
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
              {/* 좌표 미리보기(선택 사항) */}
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
              <button className="px-3 py-1 bg-green-500 text-white rounded" onClick={handleDispatch}>
                출동
              </button>
              <button className="px-3 py-1 bg-red-500 text-white rounded" onClick={() => setShowModal(false)}>
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
            setPos({ lat, lng }); // ✅ 지도 좌표 저장
            setMapOpen(false);
          }}
          onClose={() => setMapOpen(false)}
        />
      )}
    </div>
  );
};

export default Dispatch;
