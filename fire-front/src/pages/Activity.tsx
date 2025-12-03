// src/pages/ActivityPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import ActivitySummary from "../components/Activity/ActivitySummary";
import ActivityFilter from "../components/Activity/ActivityFilter";
import ActivityTable from "../components/Activity/ActivityTable";

import type { RootState, AppDispatch } from "../store";
import { setVehicles, updateVehicle } from "../features/vehicle/vehicleSlice";
import type { Vehicle } from "../types/global";
import axios from "axios";

/* -------------------------------------------------------
 * 서버 타입
 * ------------------------------------------------------- */

type ApiVehicleListItem = {
  id: number;
  stationId: number;
  sido: string;
  typeName: string;
  callSign: string;
  status: number;
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

type DispatchOrder = {
  orderId: number;
  title: string;
  address: string;
  content: string;

  vehicles: {
    vehicleId: number;
    callSign: string;
  }[];
};

/* 상태 코드 변환 */
const STATUS_LABELS: Record<number, Vehicle["status"]> = {
  0: "대기",
  1: "활동",
  2: "철수",
};

const api = axios.create({
  baseURL: "/api",
});

/* -------------------------------------------------------
 * API → Vehicle 변환
 * ------------------------------------------------------- */
// const mapApiToVehicle = (v: ApiVehicleListItem, station?: ApiFireStation): Vehicle => ({
//   id: String(v.id),
//   sido: v.sido ?? station?.sido ?? "",
//   station: station?.name ?? "",
//   type: v.typeName ?? "",
//   callname: v.callSign ?? "",
//   capacity: v.capacity ?? 0,
//   personnel: v.personnel ?? 0,
//   avl: v.avlNumber ?? "",
//   pslte: v.psLteNumber ?? "",
//   status: STATUS_LABELS[v.status] ?? "대기",
//   rally: v.rallyPoint === 1,

//   // 출동 정보 기본값
//   dispatchPlace: "",
//   content: "",
// });

/* -------------------------------------------------------
 * ActivityPage
 * ------------------------------------------------------- */
const ActivityPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const vehicles = useSelector((s: RootState) => s.vehicle.vehicles);

  const [fetching, setFetching] = useState(false);
  const [pendingReturn, setPendingReturn] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState({ sido: "전체", type: "전체", query: "" });

  /* ------------------ 최적화된 차량 + 소방서 + 출동명령 로딩 ------------------ */
  const fetchVehiclesOptimized = React.useCallback(async () => {
    try {
      setFetching(true);

      // 차량
      const vehicleRes = await api.get<ApiVehicleListItem[]>("/vehicles");
      const vehicleList = vehicleRes.data;

      // 소방서 전체
      const stationRes = await api.get<ApiFireStation[]>("/fire-stations");
      const stationMap = new Map(stationRes.data.map((s) => [s.id, s]));

      // 출동명령 전체
      const ordersRes = await api.get<DispatchOrder[]>("/dispatch-orders");
      const orders = ordersRes.data;

      // vehicleId → order 매핑
      const orderMap = new Map<string, DispatchOrder>();
      orders.forEach((order) =>
        order.vehicles.forEach((vh) => orderMap.set(String(vh.vehicleId), order))
      );

      // 병합
      const finalList: Vehicle[] = vehicleList.map((v) => {
        const station = stationMap.get(v.stationId);
        const order = orderMap.get(String(v.id));

        return {
          id: String(v.id),
          stationId: v.stationId,
          sido: v.sido ?? station?.sido ?? "",
          station: station?.name ?? "",
          type: v.typeName,
          callname: v.callSign,
          capacity: String(v.capacity ?? "0"),
          personnel: String(v.personnel ?? "0"),
          avl: v.avlNumber ?? "",
          pslte: v.psLteNumber ?? "",
          status: STATUS_LABELS[v.status],
          rally: v.rallyPoint === 1,
          dispatchPlace: order?.address ?? "",
          content: order?.content ?? "",
        };
      });

      dispatch(setVehicles(finalList));
    } finally {
      setFetching(false);
    } 
  }, [dispatch]
  );

  /* ----------------------- 초기 로딩 ---------------------- */
  useEffect(() => {
    fetchVehiclesOptimized();
  }, [fetchVehiclesOptimized]);

  /* ----------------------- 복귀 처리 ---------------------- */
  const onReturn = async (id: string) => {
    if (!window.confirm("복귀 처리하시겠습니까?")) return;

    if (pendingReturn[id]) return;
    setPendingReturn((m) => ({ ...m, [id]: true }));

    try {
      // 1) 낙관적 업데이트
      dispatch(
        updateVehicle({
          id,
          patch: { status: "대기", dispatchPlace: "", content: "" },
        })
      );

      // 2) 서버 상태 변경
      await api.patch(`/vehicles/${id}/status`, { status: 0 });

      // 3) 서버 최신상태 갱신 (정확한 값으로)
      await fetchVehiclesOptimized();
    } catch {
      alert("복귀 처리 실패");
    } finally {
      setPendingReturn((m) => {
        const next = { ...m };
        delete next[id];
        return next;
      });
    }
  };

  /* ----------------------- 필터 ---------------------- */
  const filteredVehicles = useMemo(() => {
    const q = filter.query.toLowerCase().trim();
    return vehicles.filter((v) => {
      if (filter.sido !== "전체" && v.sido !== filter.sido) return false;
      if (filter.type !== "전체" && v.type !== filter.type) return false;

      if (q) {
        const hay = `${v.callname} ${v.station} ${v.type} ${v.sido}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [vehicles, filter]);

  /* -------------------- 활동 차량만 ------------------- */
  const activeVehicles = filteredVehicles.filter(
    (v) => v.status === "활동" || v.status === "출동중"
  );

  /* -------------------------------------------------------
   * 렌더링
   * ------------------------------------------------------- */
  return (
    <div style={{ padding: 20 }}>
      <button
        onClick={fetchVehiclesOptimized}
        disabled={fetching}
        style={{
          padding: "6px 12px",
          background: "#4b5563",
          color: "#fff",
          borderRadius: 6,
          marginBottom: 12,
        }}
      >
        {fetching ? "불러오는 중..." : "새로고침"}
      </button>

      <ActivitySummary vehicles={activeVehicles} />
      <ActivityFilter filter={filter} setFilter={setFilter} />

      <ActivityTable vehicles={activeVehicles} onReturn={onReturn} />
    </div>
  );
};

export default ActivityPage;
