/* eslint-disable @typescript-eslint/no-unused-vars */
// src/pages/ActivityPage.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  // createdAt?: string; // 있으면 써도 됨
  vehicles: {
    vehicleId: number;
    callSign: string;
  }[];
};

type FilterState = {
  sido: string;
  type: string;
  query: string;
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
 * ActivityPage
 * ------------------------------------------------------- */
const ActivityPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const vehicles = useSelector((s: RootState) => s.vehicle.vehicles);

  const [fetching, setFetching] = useState(false);
  const [pendingReturn, setPendingReturn] = useState<Record<string, boolean>>(
    {}
  );
  const [filter, setFilter] = useState<FilterState>({
    sido: "전체",
    type: "전체",
    query: "",
  });

  // 🔁 가장 마지막 fetch만 유효하게 하기 위한 id
  const fetchIdRef = useRef(0);

  /* ------------------ 최적화된 차량 + 소방서 + 출동명령 로딩 ------------------ */
  const fetchVehiclesOptimized = useCallback(async () => {
    const myFetchId = ++fetchIdRef.current; // 이번 fetch 번호
    setFetching(true);

    try {
      // 🔹 1) 세 API를 동시에 호출 (병렬)
      const [vehicleRes, stationRes, ordersRes] = await Promise.all([
        api.get<ApiVehicleListItem[]>("/vehicles"),
        api.get<ApiFireStation[]>("/fire-stations"),
        api.get<DispatchOrder[]>("/dispatch-orders"),
      ]);

      const vehicleList = vehicleRes.data;
      const stationMap = new Map<number, ApiFireStation>(
        stationRes.data.map((s) => [s.id, s])
      );
      const orders = ordersRes.data;

      // 🔹 2) vehicleId → "가장 최근" DispatchOrder 매핑
      //     - orderId가 클수록 최신이라고 가정
      const orderMap = new Map<number, DispatchOrder>();
      orders.forEach((order) => {
        order.vehicles.forEach((vh) => {
          const prev = orderMap.get(vh.vehicleId);
          if (!prev || order.orderId > prev.orderId) {
            orderMap.set(vh.vehicleId, order);
          }
        });
      });

      // 🔹 3) 병합
      const finalList: Vehicle[] = vehicleList.map((v) => {
        const station = stationMap.get(v.stationId);
        const order = orderMap.get(v.id);

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
          status: STATUS_LABELS[v.status] ?? "대기",
          rally: v.rallyPoint === 1,

          // 🔥 가장 최신 출동 정보
          dispatchPlace: order?.address ?? "",
          content: order?.content ?? "",
        };
      });

      // 🔹 4) 출동이 있는 차량 기준으로 정렬 (최신 출동이 위로 오게)
      finalList.sort((a, b) => {
        const orderA = orderMap.get(Number(a.id));
        const orderB = orderMap.get(Number(b.id));
        const idA = orderA?.orderId ?? 0;
        const idB = orderB?.orderId ?? 0;
        return idB - idA;
      });

      // 🔹 5) 마지막 fetch가 아니면 버림 (레이스 컨디션 방지)
      if (myFetchId === fetchIdRef.current) {
        dispatch(setVehicles(finalList));
      }
    } finally {
      // 마지막 fetch 여부와 상관없이 로딩 표시만 끔
      setFetching(false);
    }
  }, [dispatch]);

  /* ----------------------- 초기 로딩 ---------------------- */
  useEffect(() => {
    fetchVehiclesOptimized();
  }, [fetchVehiclesOptimized]);

  /* ----------------------- 복귀 처리 ---------------------- */
  const onReturn = async (id: string) => {
    if (!window.confirm("복귀 처리하시겠습니까?")) return;
    if (pendingReturn[id]) return; // 같은 차량 중복 클릭 방지

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

      // 3) 서버 최신상태 갱신
      //    - fetchIdRef로 이전 요청 결과는 무시되므로
      //      여러 차량 빠르게 눌러도 마지막 결과만 반영됨
      await fetchVehiclesOptimized();
    } catch (e) {
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
      <ActivityTable
        vehicles={activeVehicles}
        onReturn={onReturn}
      />
    </div>
  );
};

export default ActivityPage;
