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
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th>선택</th>
            <th>연번</th>
            <th>시도</th>
            <th>소방서</th>
            <th>차종</th>
            <th>호출명</th>
            <th>용량</th>
            <th>인원</th>
            <th>AVL</th>
            <th>PS-LTE</th>
            <th>상태</th>
            <th>자원집결지</th>
          </tr>
        </thead>
        <tbody>
          {sortedVehicles.map((v, i) => (
            <tr key={v.id} className="border-t">
              <td>
                <input
                  type="checkbox"
                  checked={selected.includes(v.id)}
                  onChange={() => toggleSelect(v.id)}
                  disabled={v.status === "출동중"}
                />
              </td>
              <td>{i + 1}</td>
              <td>{v.sido}</td>
              <td>{v.station}</td>
              <td>{v.type}</td>
              <td>{v.callname}</td>
              <td>{v.capacity}</td>
              <td>{v.personnel}</td>
              <td>{v.avl}</td>
              <td>{v.pslte}</td>
              <td>{v.status}</td>
              <td>{v.rally ? "O" : "X"}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
