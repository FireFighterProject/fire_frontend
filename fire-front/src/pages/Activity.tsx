/* eslint-disable @typescript-eslint/no-explicit-any */
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

// 🚒 /dispatch-orders/vehicle/{vehicleId} 예상 응답 타입
type VehicleDispatchOrder = {
  orderId: number;
  title: string;
  address: string;
  content: string;
  // 필요하면 vehicles 등 다른 필드도 추가 가능
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

  // vehicleId -> orderId 매핑 (현재 출동 중인 주문)
  const [orderIdMap, setOrderIdMap] = useState<Record<string, number>>({});

  const [filter, setFilter] = useState<FilterState>({
    sido: "전체",
    type: "전체",
    query: "",
  });

  // 🔁 가장 마지막 fetch만 유효하게 하기 위한 id
  const fetchIdRef = useRef(0);

  /* ------------------ 활동 차량의 출동 정보 채우기 ------------------ */
  const fillActiveDispatchInfo = useCallback(
    async (vehicleList: Vehicle[], fetchId: number) => {
      // "활동" 또는 "출동중"인 차량만 대상
      const activeVehicles = vehicleList.filter(
        (v) => v.status === "활동" || v.status === "출동중"
      );

      if (activeVehicles.length === 0) return;

      await Promise.all(
        activeVehicles.map(async (v) => {
          try {
            const res = await api.get<any>(
              `/dispatch-orders/vehicle/${v.id}`
            );

            // 다른 fetch가 더 늦게 실행된 경우라면 이 응답은 무시
            if (fetchId !== fetchIdRef.current) return;

            const data = res.data as any;

            // 백엔드가 "출동 상태가 아닙니다." 같은 메시지만 주는 경우 방어
            if (!data || typeof data !== "object" || !("orderId" in data)) {
              return;
            }

            const order = data as VehicleDispatchOrder;

            // 1) vehicle ↔ orderId 매핑 저장
            setOrderIdMap((prev) => ({
              ...prev,
              [v.id]: order.orderId,
            }));

            // 2) 화면상 출동 장소/내용 업데이트
            dispatch(
              updateVehicle({
                id: String(v.id),
                patch: {
                  dispatchPlace: order.address ?? "",
                  content: order.content ?? "",
                },
              })
            );
          } catch {
            // 404 / "출동 상태가 아닙니다." 등은 그냥 무시
          }
        })
      );
    },
    [dispatch]
  );

  /* ------------------ 차량 + 소방서 먼저 로딩 ------------------ */
  const fetchVehiclesOptimized = useCallback(async () => {
    const myFetchId = ++fetchIdRef.current; // 이번 fetch 번호
    setFetching(true);

    try {
      // 새로 불러올 때 orderIdMap 초기화
      setOrderIdMap({});

      // 🔹 1) 차량 + 소방서를 동시에 호출 (병렬)
      const [vehicleRes, stationRes] = await Promise.all([
        api.get<ApiVehicleListItem[]>("/vehicles"),
        api.get<ApiFireStation[]>("/fire-stations"),
      ]);

      const vehicleList = vehicleRes.data;
      const stationMap = new Map<number, ApiFireStation>(
        stationRes.data.map((s) => [s.id, s])
      );

      // 🔹 2) 기본 Vehicle 리스트 구성 (출동 정보는 비워둠)
      const baseList: Vehicle[] = vehicleList.map((v) => {
        const station = stationMap.get(v.stationId);

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
          dispatchPlace: "",
          content: "",
        };
      });

      // 🔹 3) 가장 최신 fetch만 반영
      if (myFetchId === fetchIdRef.current) {
        dispatch(setVehicles(baseList));
      }

      // 🔹 4) 그 다음에 활동 차량에 한해서 출동 정보만 개별 조회해서 채움
      await fillActiveDispatchInfo(baseList, myFetchId);
    } finally {
      setFetching(false);
    }
  }, [dispatch, fillActiveDispatchInfo]);

  /* ----------------------- 초기 로딩 ---------------------- */
  useEffect(() => {
    fetchVehiclesOptimized();
  }, [fetchVehiclesOptimized]);

  /* ----------------------- 복귀 처리 ---------------------- */
  const onReturn = async (vehicleId: string) => {
    if (!window.confirm("복귀 처리하시겠습니까?")) return;
    if (pendingReturn[vehicleId]) return; // 같은 차량 중복 클릭 방지

    // 1) 우선 orderId 확보
    let orderId = orderIdMap[vehicleId];

    // 만약 아직 맵에 없다면, 백엔드에서 한 번 더 조회해서 확보
    if (!orderId) {
      try {
        const res = await api.get<any>(
          `/dispatch-orders/vehicle/${vehicleId}`
        );
        const data = res.data as any;
        if (!data || typeof data !== "object" || !("orderId" in data)) {
          alert("출동 정보가 없어 복귀 처리할 수 없습니다.");
          return;
        }
        orderId = data.orderId as number;
        setOrderIdMap((prev) => ({ ...prev, [vehicleId]: orderId! }));
      } catch {
        alert("출동 정보를 조회할 수 없어 복귀 처리에 실패했습니다.");
        return;
      }
    }

    setPendingReturn((m) => ({ ...m, [vehicleId]: true }));

    try {
      // 2) 낙관적 업데이트 (바로 화면에서 대기로 변경 + 출동 정보 제거)
      dispatch(
        updateVehicle({
          id: vehicleId,
          patch: { status: "대기", dispatchPlace: "", content: "" },
        })
      );

      // 3) 서버에 출동명령 복귀 요청
      await api.post(`/dispatch-orders/${orderId}/return`);

      // 필요하면 여기서 fetchVehiclesOptimized()로 전체 싱크 맞춰도 됨
      // 하지만 매번 전체 새로고침하면 느려지니까 기본은 생략
    } catch {
      alert("복귀 처리 실패");
    } finally {
      setPendingReturn((m) => {
        const next = { ...m };
        delete next[vehicleId];
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
