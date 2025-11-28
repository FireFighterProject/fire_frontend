// src/pages/Dispatch.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import KakaoMapModal from "../components/Dispatch/KakaoMapModal";
import type { RootState, AppDispatch } from "../store";
import { setVehicles } from "../features/vehicle/vehicleSlice";
import type { Vehicle } from "../types/global";

import {
  createDispatchOrder,
  assignVehicle,
  sendDispatchOrder,
} from "../api/dispatchOrders";

import axios from "axios";

/* ===========================
    API 타입
=========================== */
type ApiVehicleListItem = {
  id: number;
  stationId: number;
  sido: string;
  typeName: string;
  callSign: string;
  status: number; // 0=대기, 1=활동, 2=철수
  rallyPoint: number;
  capacity?: number;
  personnel?: number;
  avlNumber?: string;
  psLteNumber?: string;
};

type ApiFireStation = {
  id: number;
  sido: string;
  name: string;
  address: string;
};

/* ===========================
    상태코드 라벨
=========================== */
const STATUS_LABELS: Record<number, Vehicle["status"]> = {
  0: "대기",
  1: "출동중",
  2: "철수",
};

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

/* ===========================
    매핑 함수
=========================== */
const mapApiToVehicle = (
  v: ApiVehicleListItem,
  station?: ApiFireStation
): Vehicle => ({
  id: String(v.id),
  sido: v.sido ?? station?.sido ?? "",
  station: station?.name ?? "",
  type: v.typeName,
  callname: v.callSign,
  capacity: v.capacity ?? 0,
  personnel: v.personnel ?? 0,
  avl: v.avlNumber ?? "",
  pslte: v.psLteNumber ?? "",
  status: STATUS_LABELS[v.status],
  rally: v.rallyPoint === 1,
});

/* ================================================================
    Dispatch Page
================================================================ */
const DispatchPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const vehicles = useSelector((s: RootState) => s.vehicle.vehicles);

  const [fetching, setFetching] = useState(false);

  /* 출동 생성 패널 상태 */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  /* 편성 상태 */
  const [selected, setSelected] = useState<string[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);

  /* 소방서 캐시 */
  const [stationCache, setStationCache] =
    useState<Record<number, ApiFireStation>>({});

  /* ===========================
      소방서 정보 조회
  ============================ */
  const getStations = async (ids: number[]) => {
    const unique = Array.from(new Set(ids));
    const need = unique.filter((id) => !stationCache[id]);

    let fetched: Array<[number, ApiFireStation]> = [];

    if (need.length) {
      fetched = await Promise.all(
        need.map((id) =>
          api
            .get<ApiFireStation>(`/fire-stations/${id}`)
            .then((r) => [id, r.data] as const)
        )
      );
    }

    const next = { ...stationCache };
    fetched.forEach(([id, fs]) => (next[id] = fs));

    if (fetched.length) setStationCache(next);

    return next;
  };

  /* ===========================
      차량 불러오기
  ============================ */
  const fetchVehicles = async () => {
    try {
      setFetching(true);
      const res = await api.get<ApiVehicleListItem[]>("/vehicles");
      const list = res.data ?? [];

      const stations = await getStations(list.map((v) => v.stationId));

      const mapped = list.map((v) => mapApiToVehicle(v, stations[v.stationId]));
      dispatch(setVehicles(mapped));
    } catch {
      alert("차량 목록 조회 실패");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  /* ===========================
      체크박스 선택
  ============================ */
  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  /* ===========================
      차량 정렬
  ============================ */
  const sortedVehicles = useMemo(() => {
    return [...vehicles].sort((a, b) =>
      a.status === "출동중" && b.status !== "출동중" ? -1 : 1
    );
  }, [vehicles]);

  /* ===========================
      로컬 편성
  ============================ */
  const handleAssignLocal = () => {
    if (selected.length === 0) return alert("차량을 선택하세요.");
    setAssigned((prev) => [...prev, ...selected.filter((id) => !prev.includes(id))]);
    setSelected([]);
  };

  const removeAssigned = (id: string) => {
    setAssigned((prev) => prev.filter((v) => v !== id));
  };

  /* ===========================
      출동 발송 (전체 자동)
  ============================ */
  const handleSendAll = async () => {
    if (!title.trim()) return alert("출동 제목을 입력하세요.");
    if (!address.trim()) return alert("출동 주소를 입력하세요.");
    if (assigned.length === 0) return alert("편성된 차량이 없습니다.");

    try {
      /* 1) 출동 명령 생성 */
      const res = await createDispatchOrder({
        stationId: 1,
        title,
        description,
      });

      const orderId = res.data.dispatchOrderId;

      /* 2) 차량 편성 */
      for (const vid of assigned) {
        await assignVehicle(orderId, Number(vid));
      }

      /* 3) 차량 상태 변경 (출동중) */
      for (const vid of assigned) {
        await api.patch(`/vehicles/${vid}/status`, { status: 1 });
      }

      /* 4) 출동 발송 */
      await sendDispatchOrder(orderId);

      alert("출동 완료!");

      /* 초기화 */
      setTitle("");
      setDescription("");
      setAddress("");
      setPos(null);
      setAssigned([]);
      setSelected([]);

      fetchVehicles();
    } catch {
      alert("출동 처리 중 오류 발생");
    }
  };

  /* ===========================
      UI
  ============================ */
  return (
    <div className="p-6 space-y-6">

      {/* 출동 생성 패널 */}
      <section className="border rounded p-4 bg-gray-50 space-y-3">
        <h2 className="font-bold text-lg">출동 생성</h2>

        <div>
          <label className="font-medium">출동 제목</label>
          <input
            className="border p-2 w-full rounded"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="font-medium">출동 내용</label>
          <textarea
            className="border p-2 w-full rounded"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="font-medium">출동 주소</label>
          <div className="flex gap-2">
            <input
              className="border p-2 flex-1 rounded"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <button
              className="px-3 py-2 border rounded bg-white"
              onClick={() => setMapOpen(true)}
            >
              MAP
            </button>
          </div>

          {pos && (
            <p className="text-sm text-gray-600 mt-1">
              좌표: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
            </p>
          )}
        </div>

        <button
          className="px-4 py-2 bg-red-600 text-white rounded mt-2 w-full"
          onClick={handleSendAll}
        >
          출동 발송
        </button>
      </section>

      {/* 편성된 차량 패널 */}
      <section className="border rounded p-4 bg-gray-100 space-y-2">
        <h2 className="font-bold text-lg">편성된 차량</h2>

        {assigned.length === 0 ? (
          <p className="text-gray-500 text-sm">아직 편성된 차량이 없습니다.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {assigned.map((id) => {
              const v = vehicles.find((vv) => vv.id === id);
              if (!v) return null;
              return (
                <li
                  key={id}
                  className="flex justify-between bg-white p-2 rounded border"
                >
                  <span>
                    {v.callname} · {v.type} · {v.sido}
                  </span>
                  <button
                    className="text-red-600 text-sm"
                    onClick={() => removeAssigned(id)}
                  >
                    삭제
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 차량 테이블 */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-bold text-lg">차량 목록</h2>
          <button
            className="px-3 py-2 bg-blue-600 text-white rounded"
            onClick={handleAssignLocal}
          >
            차량 편성
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">선택</th>
                <th className="border px-2 py-1">시도</th>
                <th className="border px-2 py-1">소방서</th>
                <th className="border px-2 py-1">차종</th>
                <th className="border px-2 py-1">호출명</th>
                <th className="border px-2 py-1">용량</th>
                <th className="border px-2 py-1">인원</th>
                <th className="border px-2 py-1">AVL</th>
                <th className="border px-2 py-1">PS-LTE</th>
                <th className="border px-2 py-1">상태</th>
                <th className="border px-2 py-1">집결지</th>
              </tr>
            </thead>

            <tbody>
              {sortedVehicles
                .filter((v) => v.status === "대기")
                .map((v) => (
                  <tr key={v.id} className="even:bg-gray-50">
                    <td className="border px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={selected.includes(v.id)}
                        onChange={() => toggleSelect(v.id)}
                      />
                    </td>

                    <td className="border px-2 py-1 text-center">{v.sido}</td>
                    <td className="border px-2 py-1">{v.station}</td>
                    <td className="border px-2 py-1 text-center">{v.type}</td>
                    <td className="border px-2 py-1">{v.callname}</td>
                    <td className="border px-2 py-1 text-right">
                      {v.capacity}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {v.personnel}
                    </td>
                    <td className="border px-2 py-1">{v.avl}</td>
                    <td className="border px-2 py-1">{v.pslte}</td>
                    <td className="border px-2 py-1 text-center">{v.status}</td>
                    <td className="border px-2 py-1 text-center">
                      {v.rally ? "O" : "X"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* MAP 모달 */}
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

export default DispatchPage;
