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
 * 전역 kakao 타입
 * ------------------------------------------------------- */
declare global {
  interface Window {
    kakao: any;
  }
}

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
 * 카카오맵 SDK 로더
 * ------------------------------------------------------- */
const loadKakao = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.kakao?.maps) return resolve();

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-kakao-maps-sdk="true"]'
    );
    if (existingScript) {
      existingScript.onload = () => window.kakao.maps.load(resolve);
      return;
    }

    const script = document.createElement("script");
    script.dataset.kakaoMapsSdk = "true";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAOMAP_API_KEY
      }&autoload=false`;
    script.onload = () => window.kakao.maps.load(resolve);
    document.head.appendChild(script);
  });
};

/* -------------------------------------------------------
 * 지도 팝업 컴포넌트
 * ------------------------------------------------------- */
type MapPopupProps = {
  vehicle: Vehicle;
  onClose: () => void;
};

const MapPopup: React.FC<MapPopupProps> = ({ vehicle, onClose }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let map: any;
    let marker: any;
    let intervalId: number | null = null;
    let cancelled = false;

    const init = async () => {
      try {
        await loadKakao();
        if (!mapRef.current) return;

        const kakao = window.kakao;
        map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(36.35, 127.9),
          level: 7,
        });

        const fetchGps = async () => {
          try {
            const res = await api.get(`/gps/location/${vehicle.id}`);
            if (cancelled) return;

            const { latitude, longitude } = res.data;
            if (
              typeof latitude !== "number" ||
              typeof longitude !== "number"
            ) {
              throw new Error("invalid gps");
            }

            const pos = new kakao.maps.LatLng(latitude, longitude);

            if (!marker) {
              marker = new kakao.maps.Marker({
                map,
                position: pos,
              });
            } else {
              marker.setPosition(pos);
            }

            map.setCenter(pos);
            setLoading(false);
            setError(null);
          } catch (e) {
            console.error("GPS 위치 조회 실패:", e);
            if (!cancelled) {
              setError("GPS 위치를 가져올 수 없습니다.");
              setLoading(false);
            }
          }
        };

        await fetchGps();
        // 5초마다 위치 갱신
        intervalId = window.setInterval(fetchGps, 5000);
      } catch (e) {
        console.error("카카오맵 초기화 실패:", e);
        if (!cancelled) {
          setError("지도를 불러오는 중 오류가 발생했습니다.");
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      if (marker) marker.setMap(null);
      map = null;
    };
  }, [vehicle.id]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl h-[70vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <div className="font-semibold text-gray-800">
            {vehicle.callname} 위치 보기
          </div>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300"
          >
            닫기
          </button>
        </div>

        {/* 정보 영역 */}
        <div className="px-4 py-2 text-xs text-gray-600 border-b space-y-1">
          <div>
            <span className="font-semibold">시/도</span> {vehicle.sido}{" "}
            <span className="font-semibold ml-2">소방서</span>{" "}
            {vehicle.station || "-"}
          </div>
          <div>
            <span className="font-semibold">출동 장소</span>{" "}
            {vehicle.dispatchPlace || "-"}
          </div>
        </div>

        {/* 지도 */}
        <div className="flex-1 relative">
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
              지도를 불러오는 중입니다...
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500 z-10">
              {error}
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};

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

  // 가장 마지막 fetch만 유효하게 하기 위한 id (레이스 컨디션 방지)
  const fetchIdRef = useRef(0);

  // ✅ 지도 팝업용 상태
  const [mapTarget, setMapTarget] = useState<Vehicle | null>(null);

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

            // 화면 출동 장소 / 내용만 채워줌
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
      // 1) 차량 + 소방서를 동시에 호출 (병렬)
      const [vehicleRes, stationRes] = await Promise.all([
        api.get<ApiVehicleListItem[]>("/vehicles"),
        api.get<ApiFireStation[]>("/fire-stations"),
      ]);

      const vehicleList = vehicleRes.data;
      const stationMap = new Map<number, ApiFireStation>(
        stationRes.data.map((s) => [s.id, s])
      );

      // 2) 기본 Vehicle 리스트 구성 (출동 정보는 비워둠)
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

          // 출동 정보는 나중에 latest-by-vehicle로 채움
          dispatchPlace: "",
          content: "",
        };
      });

      // 3) 가장 최신 fetch만 반영
      if (myFetchId === fetchIdRef.current) {
        dispatch(setVehicles(baseList));
      }

      // 4) 활동 차량에 한해서 최신 출동 정보 채우기
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

    // 이 차량은 지금 복귀 처리 중
    setPendingReturn((m) => ({ ...m, [vehicleId]: true }));

    try {
      // 1) 낙관적 업데이트 (바로 "대기" + 출동 정보 제거)
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

      // 2) 서버에 차량 상태를 0(대기)로 변경 요청
      await api.patch(`/vehicles/${vehicleId}/status`, {
        status: 0,
      });
    } catch {
      alert("복귀 처리 실패");
      // 필요하면 여기서 상태 롤백도 가능
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
      <ActivityTable
        vehicles={activeVehicles}
        onReturn={onReturn}
        onOpenMap={(v) => setMapTarget(v)} // ✅ 지도 팝업 열기
      />

      {/* ✅ 지도 팝업 표시 */}
      {mapTarget && (
        <MapPopup vehicle={mapTarget} onClose={() => setMapTarget(null)} />
      )}
    </div>
  );
};

export default ActivityPage;
