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

//  /dispatch-orders/latest-by-vehicle/{vehicleId} 응답 타입
type LatestDispatchResponse = {
  orderId: number;
  address: string;
  content: string;
  message: string; // "현재 출동 중입니다." 또는 "출동 이력이 없습니다" 등
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

  // vehicleId(string) → orderId 매핑 (가장 최근 출동명령)
  const [orderIdMap, setOrderIdMap] = useState<Record<string, number>>({});

  //  가장 마지막 fetch만 유효하게 하기 위한 id (레이스 컨디션 방지)
  const fetchIdRef = useRef(0);

  /* ------------------ 활동 차량의 최신 출동 정보 채우기 ------------------ */
  const fillLatestDispatchInfo = useCallback(
    async (vehicleList: Vehicle[], fetchId: number) => {
      // "활동" 또는 "출동중"인 차량만 요청
      const activeVehicles = vehicleList.filter(
        (v) => v.status === "활동" || v.status === "출동중"
      );
      if (activeVehicles.length === 0) return;

      await Promise.all(
        activeVehicles.map(async (v) => {
          try {
            const res = await api.get<LatestDispatchResponse>(
              `/dispatch-orders/latest-by-vehicle/${v.id}`
            );

            // 더 최신 fetch가 있으면 이 응답은 버림
            if (fetchId !== fetchIdRef.current) return;

            const data = res.data;

            // "출동 이력이 없습니다" 같은 메시지면 무시
            if (
              !data ||
              typeof data !== "object" ||
              (data.message &&
                data.message.includes("출동 이력이 없습니다"))
            ) {
              return;
            }

            // 1) vehicleId → orderId 매핑 저장
            setOrderIdMap((prev) => ({
              ...prev,
              [String(v.id)]: data.orderId,
            }));

            // 2) 화면 출동 장소 / 내용 업데이트
            dispatch(
              updateVehicle({
                id: String(v.id),
                patch: {
                  dispatchPlace: data.address ?? "",
                  content: data.content ?? "",
                },
              })
            );
          } catch {
            // 404, 500 등 오류는 일단 무시 (해당 차량 출동정보 없음 처리)
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
      // 호출할 때마다 orderIdMap 초기화
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

          // 🔥 출동 정보는 나중에 latest-by-vehicle로 채움
          dispatchPlace: "",
          content: "",
        };
      });

      // 🔹 3) 가장 최신 fetch만 반영
      if (myFetchId === fetchIdRef.current) {
        dispatch(setVehicles(baseList));
      }

      // 🔹 4) 활동 차량에 한해서 최신 출동 정보 채우기
      await fillLatestDispatchInfo(baseList, myFetchId);
    } finally {
      setFetching(false);
    }
  }, [dispatch, fillLatestDispatchInfo]);

  /* ----------------------- 초기 로딩 ---------------------- */
  useEffect(() => {
    fetchVehiclesOptimized();
  }, [fetchVehiclesOptimized]);

  /* ----------------------- 복귀 처리 ---------------------- */
  const onReturn = async (vehicleId: string) => {
    if (!window.confirm("복귀 처리하시겠습니까?")) return;
    if (pendingReturn[vehicleId]) return; // 같은 차량 중복 클릭 방지

    // 이 차량은 지금 복귀 요청 처리 중
    setPendingReturn((m) => ({ ...m, [vehicleId]: true }));

    try {
      // 1) 낙관적 업데이트 (화면에서 먼저 대기로 변경 + 출동 정보 제거)
      dispatch(
        updateVehicle({
          id: vehicleId,
          patch: {
            status: "대기",
            dispatchPlace: "",
            content: "",
          },
        })
      );

      // 2) 실제 서버에 상태 변경 요청 (0 = 대기)
      await api.patch(`/vehicles/${vehicleId}/status`, {
        status: 0,
      });

      // 3) 서버 최신 데이터 다시 로드해서 동기화
      await fetchVehiclesOptimized();
    } catch (e) {
      alert("복귀 처리 실패");
    } finally {
      // pendingReturn 해제
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
