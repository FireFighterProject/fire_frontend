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

/** 서버 응답 스키마 (차량) */
type ApiVehicleListItem = {
  id: number;
  stationId: number;
  sido: string;
  typeName: string;
  callSign: string;
  status: number;      // 0=대기, 1=활동, 2=철수
  rallyPoint: number;  // 0/1
  capacity?: number;
  personnel?: number;
  avlNumber?: string;
  psLteNumber?: string;
  createdAt?: string;
  updatedAt?: string;
};

/** 서버 응답 스키마 (소방서) */
type ApiFireStation = {
  id: number;
  sido: string;
  name: string;
  address: string;
};

/** 상태코드 ↔ 라벨 */
const STATUS_LABELS: Record<number, Vehicle["status"] | string> = {
  0: "대기",
  1: "활동",
  2: "철수",
};
const LABEL_TO_STATUS: Record<string, number> = {
  대기: 0,
  활동: 1,
  철수: 2,
};

/** axios 인스턴스 */
const api = axios.create({
  baseURL: "/api", // 프록시 쓰는 중이면 이대로 OK
  headers: { "Content-Type": "application/json" },
});

/** API → UI Vehicle 매핑 (소방서 정보 병합 가능) */
const mapApiToVehicle = (v: ApiVehicleListItem, station?: ApiFireStation): Vehicle => {
  const statusLabel = STATUS_LABELS[v.status] ?? String(v.status);
  return {
    id: String(v.id),

    // 차량의 sido 없으면 소방서에서 보강
    sido: v.sido ?? station?.sido ?? "",
    station: station?.name ?? "",

    type: v.typeName ?? "",
    callname: v.callSign ?? "",

    capacity: Number.isFinite(v.capacity as number) ? (v.capacity as number) : 0,
    personnel: Number.isFinite(v.personnel as number) ? (v.personnel as number) : 0,
    avl: v.avlNumber ?? "",
    pslte: v.psLteNumber ?? "",

    status: statusLabel as Vehicle["status"],
    rally: v.rallyPoint === 1,

    dispatchPlace: "",
    lat: undefined,
    lng: undefined,
    contact: "",
    content: "",
  } as Vehicle;
};

const ActivityPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const vehicles = useSelector((s: RootState) => s.vehicle.vehicles);

  // 로딩/뮤테이션 상태
  const [fetching, setFetching] = useState(false);
  const [pendingReturnIds, setPendingReturnIds] = useState<Record<string, boolean>>({});

  // 로컬 필터 상태
  const [filter, setFilter] = useState({ sido: "전체", type: "전체", query: "" });

  // 소방서 캐시: id -> ApiFireStation
  const [stationCache, setStationCache] = useState<Record<number, ApiFireStation>>({});

  /** station id 목록을 받아
   *  1) 캐시에 없는 것만 병렬 조회
   *  2) "조회결과 + 기존캐시"를 머지한 최신 딕셔너리를 반환
   *  (setState 비동기라서, 매핑은 반환값으로 즉시 사용)
   */
  const getStationsDict = async (stationIds: number[]) => {
    const unique = Array.from(new Set(stationIds.filter((n) => Number.isFinite(n))));
    const need = unique.filter((id) => !stationCache[id]);

    let fetched: Array<[number, ApiFireStation]> = [];
    if (need.length) {
      fetched = await Promise.all(
        need.map((id) =>
          api.get<ApiFireStation>(`/fire-stations/${id}`).then((r) => [id, r.data] as const)
        )
      );
    }

    // 최신 딕셔너리 구성
    const next: Record<number, ApiFireStation> = { ...stationCache };
    for (const [id, fs] of fetched) next[id] = fs;

    // setState로 캐시 갱신 (비동기지만 실제 매핑은 next로 즉시 사용)
    if (fetched.length) setStationCache(next);

    return next;
  };

  /** 차량 목록 조회 (+ 소방서명 병합) */
  const fetchVehicles = async (params?: {
    stationId?: number;
    status?: number;
    typeName?: string;
    callSign?: string;
  }) => {
    try {
      setFetching(true);

      // 1) 차량 목록
      const res = await api.get<ApiVehicleListItem[]>("/vehicles", { params });
      const list = res.data ?? [];

      // 2) stationId 기반으로 소방서 딕셔너리 확보
      const ids = list.map((v) => v.stationId).filter((n) => Number.isFinite(n)) as number[];
      const stationsDict = await getStationsDict(ids);

      // 3) 매핑 (station.name/sido 병합)
      const mapped = list.map((v) => mapApiToVehicle(v, stationsDict[v.stationId]));
      dispatch(setVehicles(mapped));
    } catch (e) {
      console.error(e);
      alert("차량 목록을 불러오지 못했습니다.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 필터링(클라이언트)
  const filtered = useMemo(() => {
    const q = filter.query.trim().toLowerCase();
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

  // 활동 차량(백엔드 기준 1=활동)
  const activeVehicles = useMemo(() => {
    return filtered.filter((v) => v.status === "활동" || v.status === "출동중"); // 과거 데이터 호환
  }, [filtered]);

  /** PATCH 후에도 station 보장 */
  const fetchStationIfNeeded = async (stationId?: number) => {
    if (!Number.isFinite(stationId)) return undefined;
    const id = stationId as number;
    if (stationCache[id]) return stationCache[id];
    try {
      const { data } = await api.get<ApiFireStation>(`/fire-stations/${id}`);
      setStationCache((prev) => ({ ...prev, [id]: data }));
      return data;
    } catch {
      return undefined;
    }
  };

  /** ▼▼ 복귀 API 호출 ▼▼ */
  const handleReturn = async (id: string) => {
    const confirmed = window.confirm("복귀하시겠습니까?");
    if (!confirmed) return;

    if (pendingReturnIds[id]) return;
    try {
      setPendingReturnIds((m) => ({ ...m, [id]: true }));
      // 낙관적 UI
      dispatch(updateVehicle({ id, patch: { status: "대기" } }));

      const res = await api.patch<ApiVehicleListItem>(`/vehicles/${id}/status`, {
        status: LABEL_TO_STATUS["대기"], // = 0
      });

      // 패치 응답에도 stationId가 있으니 보장
      const station = await fetchStationIfNeeded(res.data.stationId);
      const updated = mapApiToVehicle(res.data, station);
      dispatch(updateVehicle({ id, patch: updated }));

    } catch (e) {
      console.error(e);
      alert("복귀 처리에 실패했습니다. 다시 시도해주세요.");
      fetchVehicles(); // 실패 시 목록 새로고침
    } finally {
      setPendingReturnIds((m) => {
        const { [id]: _, ...rest } = m;
        return rest;
      });
    }
  };

  const handleRelocate = (id: string) => {
    alert(`${id} 차량 장소 이동 처리`);
  };

  return (
    <div style={{ padding: 20 }}>
      {/* 상단 툴바 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => fetchVehicles()}
          disabled={fetching}
          title="서버에서 최신 목록 재조회"
          style={{
            padding: "6px 12px",
            background: "#4b5563",
            color: "#fff",
            borderRadius: 6,
            opacity: fetching ? 0.6 : 1,
          }}
        >
          {fetching ? "불러오는 중..." : "새로고침"}
        </button>
      </div>

      {/* 상단 요약 */}
      <ActivitySummary vehicles={activeVehicles} />

      {/* 필터 */}
      <ActivityFilter filter={filter} setFilter={setFilter} />

      {/* 상세 테이블 */}
      <ActivityTable
        vehicles={activeVehicles}
        onReturn={handleReturn}
        onRelocate={handleRelocate}
      />
    </div>
  );
};

export default ActivityPage;
