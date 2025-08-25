import React, { useState } from "react";
import KakaoMapModal from "../components/Dispatch/KakaoMapModal"; // 

type Vehicle = {
  id: string;
  sido: string;
  station: string;
  type: string;
  callname: string;
  capacity: number;
  personnel: number;
  avl: string;
  pslte: string;
  status: "대기중" | "출동중";
  rally: boolean;
};

const initialVehicles: Vehicle[] = [
  {
    id: "v1",
    sido: "경북",
    station: "의성소방서",
    type: "펌프차",
    callname: "의성101",
    capacity: 1000,
    personnel: 3,
    avl: "000-000-1111",
    pslte: "000-000-2222",
    status: "대기중",
    rally: true,
  },
  {
    id: "v2",
    sido: "대구",
    station: "수성소방서",
    type: "구급차",
    callname: "수성119",
    capacity: 500,
    personnel: 2,
    avl: "000-111-3333",
    pslte: "000-222-4444",
    status: "출동중",
    rally: false,
  },
];

const Dispatch = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [selected, setSelected] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [content, setContent] = useState("");
  const [mapOpen, setMapOpen] = useState(false);

  // 체크박스 선택
  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  // 선택차량 출동
  const handleDispatch = () => {
    setVehicles((prev) =>
      prev.map((v) =>
        selected.includes(v.id) ? { ...v, status: "출동중" } : v
      )
    );
    setSelected([]);
    setShowModal(false);
  };

  // 출동중 차량 위로 정렬
  const sortedVehicles = [...vehicles].sort((a, b) =>
    a.status === "출동중" && b.status !== "출동중" ? -1 : 1
  );

  return (
    <div className="p-6">
      {/* 상단 버튼 */}
      <div className="mb-4 flex gap-2">
        <button
          className="px-4 py-2 bg-red-500 text-white rounded"
          onClick={() => setShowModal(true)}
          disabled={selected.length === 0}
        >
          선택차량 출동
        </button>
      </div>

      {/* 차량 테이블 */}
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-[1200px] w-full table-fixed border border-gray-300 border-collapse text-sm">
          {/* 고정 컬럼 폭 */}
          <colgroup>
            <col className="w-[56px]" />   {/* 선택 */}
            <col className="w-[64px]" />   {/* 연번 */}
            <col className="w-[88px]" />   {/* 시도 */}
            <col className="w-[180px]" />  {/* 소방서 */}
            <col className="w-[100px]" />  {/* 차종 */}
            <col className="w-[140px]" />  {/* 호출명 */}
            <col className="w-[80px]" />   {/* 용량 */}
            <col className="w-[72px]" />   {/* 인원 */}
            <col className="w-[170px]" />  {/* AVL */}
            <col className="w-[170px]" />  {/* PS-LTE */}
            <col className="w-[96px]" />   {/* 상태 */}
            <col className="w-[96px]" />   {/* 자원집결지 */}
          </colgroup>

          <thead className="bg-gray-100">
            <tr>
              {[
                "선택", "연번", "시도", "소방서", "차종", "호출명",
                "용량", "인원", "AVL", "PS-LTE", "상태", "자원집결지",
              ].map(h => (
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
                    disabled={v.status === "출동중"}
                  />
                </td>
                <td className="border px-2 py-1 text-center tabular-nums">{i + 1}</td>
                <td className="border px-2 py-1 text-center whitespace-nowrap">{v.sido}</td>
                <td className="border px-2 py-1 whitespace-nowrap">{v.station}</td>
                <td className="border px-2 py-1 text-center whitespace-nowrap">{v.type}</td>
                <td className="border px-2 py-1 whitespace-nowrap">{v.callname}</td>
                <td className="border px-2 py-1 text-right tabular-nums">{v.capacity.toLocaleString()}</td>
                <td className="border px-2 py-1 text-center tabular-nums">{v.personnel}</td>
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
            <div className="mb-2">
              <label className="block">주소:</label>
              <div className="flex gap-2">
                <input
                  className="border p-1 flex-1"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                <button
                  className="px-2 py-1 border rounded"
                  onClick={() => setMapOpen(true)}
                >
                  MAP
                </button>
              </div>
            </div>
            <div className="mb-2">
              <label className="block">연락처:</label>
              <input
                className="border p-1 w-full"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
            <div className="mb-2">
              <label className="block">내용:</label>
              <textarea
                className="border p-1 w-full"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 bg-green-500 text-white rounded"
                onClick={handleDispatch}
              >
                출동
              </button>
              <button
                className="px-3 py-1 bg-red-500 text-white rounded"
                onClick={() => setShowModal(false)}
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
          onSelect={(addr) => {
            setAddress(addr);
            setMapOpen(false);
          }}
          onClose={() => setMapOpen(false)}
        />
      )}
    </div>
  );
};

export default Dispatch;
