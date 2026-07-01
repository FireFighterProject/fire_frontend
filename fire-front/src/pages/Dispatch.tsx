// src/pages/Dispatch.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import KakaoMapModal from "../components/Dispatch/KakaoMapModal";
import { setVehicles } from "../features/vehicle/vehicleSlice";
import type { Vehicle } from "../types/global";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  createDispatchOrder,
  assignVehicle,
  sendDispatchOrder,
} from "../api/dispatchOrders";
import { fetchVehicleList } from "../api/vehicles";
import { fetchStationsByIds } from "../api/stations";
import { mapApiListToVehicles } from "../services/mappers/vehicleMapper";
import { isDispatchableStatus } from "../services/vehicle/status";
import api from "../api/axios";
import { formatPhone } from "../services/Register/utils";

const DispatchPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const vehicles = useAppSelector((s) => s.vehicle.vehicles);

  const [fetching, setFetching] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  const [selected, setSelected] = useState<string[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);

  const stationCacheRef = useRef<
    Record<number, { id: number; sido: string; name: string; address: string }>
  >({});

  const loadVehicles = useCallback(async () => {
    try {
      setFetching(true);
      const list = await fetchVehicleList();
      const stations = await fetchStationsByIds(
        list.map((v) => v.stationId),
        stationCacheRef.current
      );
      stationCacheRef.current = stations;
      const mapped = mapApiListToVehicles(list, stations);
      dispatch(setVehicles(mapped));
    } catch {
      alert("차량 목록 조회 실패");
    } finally {
      setFetching(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const sortedVehicles = useMemo(() => {
    const isActive = (v: Vehicle) => v.status === "활동" || v.status === "출동중";
    return [...vehicles].sort((a, b) =>
      isActive(a) && !isActive(b) ? -1 : 1
    );
  }, [vehicles]);

  const handleAssignLocal = () => {
    if (selected.length === 0) return alert("차량을 선택하세요.");
    setAssigned((prev) => [...prev, ...selected.filter((id) => !prev.includes(id))]);
    setSelected([]);
  };

  const removeAssigned = (id: string) => {
    setAssigned((prev) => prev.filter((v) => v !== id));
  };

  const handleSendAll = async () => {
    if (!title.trim()) return alert("출동 제목을 입력하세요.");
    if (!address.trim()) return alert("출동 주소를 입력하세요.");
    if (assigned.length === 0) return alert("편성된 차량이 없습니다.");

    try {
      const res = await createDispatchOrder({
        stationId: 1,
        title,
        description,
      });

      const orderId = res.data.dispatchOrderId;

      for (const vid of assigned) {
        await assignVehicle(orderId, Number(vid));
      }

      for (const vid of assigned) {
        await api.patch(`/vehicles/${vid}/status`, { status: 1 });
      }

      await sendDispatchOrder(orderId);

      alert("출동 완료!");

      setTitle("");
      setDescription("");
      setAddress("");
      setPos(null);
      setAssigned([]);
      setSelected([]);

      loadVehicles();
    } catch {
      alert("출동 처리 중 오류 발생");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-end mb-3">
        <button
          onClick={loadVehicles}
          disabled={fetching}
          className={`px-4 py-2 rounded text-white 
            ${fetching ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
        >
          {fetching ? "불러오는 중..." : "차량 새로고침"}
        </button>
      </div>

      <section className="border rounded p-4 bg-gray-50 space-y-3">
        <h2 className="font-bold text-lg">출동 생성</h2>

        <div>
          <label className="font-medium">출동 제목</label>
          <input
            className="notranslate border p-2 w-full rounded"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            translate="no"
            lang="ko"
          />
        </div>

        <div>
          <label className="font-medium">출동 내용</label>
          <textarea
            className="notranslate border p-2 w-full rounded"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            translate="no"
            lang="ko"
          />
        </div>

        <div>
          <label className="font-medium">출동 주소</label>
          <div className="flex gap-2">
            <input
              className="notranslate border p-2 flex-1 rounded"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              translate="no"
              lang="ko"
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

      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-bold text-lg">차량 목록</h2>
          <button
            className="px-3 py-2 bg-blue-600 text-white rounded"
            onClick={handleAssignLocal}
            disabled={fetching}
          >
            차량 편성
          </button>
        </div>

        {fetching ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            차량 정보를 불러오는 중입니다...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">선택</th>
                  <th className="border px-2 py-1">연번</th>
                  <th className="border px-2 py-1">소방서</th>
                  <th className="border px-2 py-1">호출명</th>
                  <th className="border px-2 py-1">차종</th>
                  <th className="border px-2 py-1">인원</th>
                  <th className="border px-2 py-1">연락처</th>
                  <th className="border px-2 py-1">상태</th>
                  <th className="border px-2 py-1">집결지</th>
                </tr>
              </thead>

              <tbody>
                {sortedVehicles
                  .filter((v) => isDispatchableStatus(v.status))
                  .map((v, idx) => (
                    <tr key={v.id} className="even:bg-gray-50">
                      <td className="border px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={selected.includes(String(v.id))}
                          onChange={() => toggleSelect(String(v.id))}
                        />
                      </td>
                      <td className="border px-2 py-1">{idx + 1}</td>
                      <td className="border px-2 py-1">{v.station}</td>
                      <td className="border px-2 py-1">{v.callname}</td>
                      <td className="border px-2 py-1">{v.type}</td>
                      <td className="border px-2 py-1">{v.personnel}</td>
                      <td className="border px-2 py-1">{formatPhone(v.contact)}</td>
                      <td className="border px-2 py-1">{v.status}</td>
                      <td className="border px-2 py-1">{v.rally ? "Y" : "N"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mapOpen && (
        <KakaoMapModal
          onClose={() => setMapOpen(false)}
          onSelect={({ lat, lng, address }) => {
            setPos({ lat, lng });
            setAddress(address);
            setMapOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default DispatchPage;
