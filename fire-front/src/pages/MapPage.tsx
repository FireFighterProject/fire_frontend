// src/pages/MapPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useKakaoLoader } from "../hooks/useKakaoLoader";

import MapStatsPanel from "../components/map/MapStatsPanel";
import MapFilterPanel from "../components/map/MapFilterPanel";
import PolygonLayer from "../components/map/PolygonLayer";

import type { RootState } from "../store";
import type {
  Filters,
  MapStats,
  MarkerBundle,
  Vehicle as MapVehicle,
} from "../types/map";

/* ===================== API 타입 ====================== */
type ApiLastLocation = {
  vehicleId: number;
  latitude: number;
  longitude: number;
  heading: number;
  speedKph: number;
};

type Props = {
  vehicles?: MapVehicle[];
  headerHeight?: number;
};

const API_BASE = "http://172.28.5.94:8081";
const POLL_MS = 5000;

/* ===================== 공통 함수 ====================== */
const isValidCoord = (lat?: number, lng?: number) =>
  typeof lat === "number" &&
  typeof lng === "number" &&
  !(lat === 0 && lng === 0);

function normalizeStatus(raw: unknown): string {
  if (raw === null || raw === undefined) return "기타";

  if (typeof raw === "number") {
    return raw === 0
      ? "대기"
      : raw === 1
        ? "활동"
        : raw === 2
          ? "철수"
          : "기타";
  }

  const s = String(raw).trim();
  if (s.includes("활동") || s.includes("출동")) return "활동";
  if (s.includes("대기")) return "대기";
  if (s.includes("철수") || s.includes("복귀")) return "철수";

  return "기타";
}

/* 🔥 차량 + GPS merge */
function buildMapVehicles(
  last: ApiLastLocation[],
  storeVehicles: Vehicle[]
): MapVehicle[] {
  const byId = new Map<number, Vehicle>(storeVehicles.map((v) => [Number(v.id), v]));

  return last
    .map((l) => {
      const base = byId.get(Number(l.vehicleId));
      if (!base) return null;
      if (!isValidCoord(l.latitude, l.longitude)) return null;

      const mapped: MapVehicle = {
        id: base.id,
        callname: String(base.callname ?? base.callSign ?? base.name ?? `V-${l.vehicleId}`),
        sido: String(base.sido ?? ""),
        station: String(base.station ?? base.stationName ?? ""),
        type: String(base.type ?? base.typeName ?? ""),
        personnel: Number(base.personnel) || 0,
        dispatchPlace: base.dispatchPlace ?? "",
        lat: l.latitude,
        lng: l.longitude,
        status: normalizeStatus(base.status),
      };

      (mapped as any).heading = l.heading;
      (mapped as any).speedKph = l.speedKph;
      return mapped;
    })
    .filter(Boolean) as MapVehicle[];
}

/* ======================================================= */

const MapPage = ({ vehicles: externalVehicles, headerHeight = 44 }: Props) => {
  const kakaoReady = useKakaoLoader();

  // 🔥 Redux 차량
  const storeVehicles = useSelector((s: RootState) => s.vehicle.vehicles);

  // 🔥 GPS + 차량 merge
  const [lastLocs, setLastLocs] = useState<ApiLastLocation[]>([]);

  // 🔥 지역 선택 데이터
  const [selectedSido, setSelectedSido] = useState("");

  // 🔥 통계 패널 숫자
  const [stats, setStats] = useState<MapStats>({
    visibleCount: 0,
    selectedAreaCount: 0,
    totalCount: 0,
  });

  // 🔥 필터
  const [filters, setFilters] = useState<Filters>({
    sido: "",
    station: "",
    type: "",
  });

  // 지도, 마커, 인포윈도우
  const mapRef = useRef<HTMLDivElement | null>(null);
  const map = useRef<kakao.maps.Map | null>(null);
  const markers = useRef<MarkerBundle[]>([]);
  const openedInfo = useRef<kakao.maps.InfoWindow | null>(null);

  /* ================= GPS 데이터 polling ================= */
  useEffect(() => {
    let abort = new AbortController();

    const fetchLast = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/gps/last-locations/all?stationId=1`, {
          headers: { accept: "*/*" },
          signal: abort.signal,
        });

        if (!res.ok) throw new Error("fetch error");
        const data: ApiLastLocation[] = await res.json();
        setLastLocs(Array.isArray(data) ? data : []);
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          console.error("GPS fetch 실패:", err);
        }
      }
    };

    fetchLast();
    const timer = setInterval(fetchLast, POLL_MS);

    return () => {
      abort.abort();
      clearInterval(timer);
    };
  }, []);

  /* ================= GPS + 차량 merge ================= */
  const joinedVehicles = useMemo(
    () => buildMapVehicles(lastLocs, storeVehicles as any[]),
    [lastLocs, storeVehicles]
  );

  /* ================= 차량 목록 최종 결정 ================= */
  const data: MapVehicle[] = useMemo(() => {
    if (externalVehicles?.length) return externalVehicles;
    if (joinedVehicles.length) return joinedVehicles;

    return (storeVehicles as any[])
      .filter((v) => v && isValidCoord(v.lat, v.lng))
      .map((v) => ({
        id: v.id,
        callname: v.callname,
        sido: v.sido,
        station: v.station,
        type: v.type,
        personnel: Number(v.personnel) || 0,
        dispatchPlace: v.dispatchPlace ?? "",
        lat: v.lat,
        lng: v.lng,
        status: normalizeStatus(v.status),
      })) as MapVehicle[];
  }, [externalVehicles, joinedVehicles, storeVehicles]);

  /* ================= 필터 처리 ================= */
  const filtered = useMemo(() => {
    return data.filter(
      (v) =>
        (!filters.sido || v.sido === filters.sido) &&
        (!filters.station || v.station === filters.station) &&
        (!filters.type || v.type === filters.type)
    );
  }, [data, filters]);

  /* ================= 필터 옵션 ================= */
  const options = useMemo(() => {
    const sidos = [...new Set(data.map((v) => v.sido))].sort();
    const stations = [...new Set(data.map((v) => v.station))].sort();
    const types = [...new Set(data.map((v) => v.type))].sort();
    return { sidos, stations, types };
  }, [data]);

  /* ================= 지도 초기화 ================= */
  useEffect(() => {
    if (!kakaoReady || !mapRef.current) return;

    const kakao = window.kakao;
    const m = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(36.35, 127.9),
      level: 12,
    });

    map.current = m;

    m.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
    m.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPRIGHT);

    return () => { };
  }, [kakaoReady]);

  /* ================= 마커 렌더링 ================= */
  const clearMarkers = () => {
    markers.current.forEach((m) => {
      m.marker.setMap(null);
      m.info?.close();
    });
    markers.current = [];
  };

  const drawMarkers = () => {
    if (!map.current) return;
    clearMarkers();

    const kakao = window.kakao;

    filtered.forEach((v) => {
      const pos = new kakao.maps.LatLng(v.lat, v.lng);
      const marker = new kakao.maps.Marker({
        map: map.current!,
        position: pos,
      });

      const content = `
      <div style="min-width:220px;padding:8px 10px;border-radius:8px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.12);">
        <div style="font-weight:600;margin-bottom:4px">${v.callname}</div>
        <div style="font-size:12px;line-height:1.5">
          <div><b>시/도</b> ${v.sido} · <b>소방서</b> ${v.station}</div>
          <div><b>종류</b> ${v.type} · <b>인원</b> ${v.personnel}명</div>
          <div><b>출동 장소</b> ${v.dispatchPlace ?? "-"}</div>
        </div>
      </div>`.trim();

      const info = new kakao.maps.InfoWindow({ content });

      kakao.maps.event.addListener(marker, "click", () => {
        if (openedInfo.current === info) {
          info.close();
          openedInfo.current = null;
        } else {
          openedInfo.current?.close();
          info.open(map.current!, marker);
          openedInfo.current = info;
        }
      });

      markers.current.push({ marker, info, data: v });
    });
  };

  useEffect(() => {
    if (!map.current || !kakaoReady) return;

    drawMarkers();

    setStats((s) => ({
      ...s,
      visibleCount: filtered.length,
      totalCount: data.length,
    }));
  }, [filtered, kakaoReady]);

  /* ================= 지역 클릭 콜백 ================= */
  const handleRegionSelect = (regionName: string, regionData: MapVehicle[]) => {
    setSelectedSido(regionName);

    setStats((s) => ({
      ...s,
      selectedAreaCount: regionData.length,
    }));
  };

  /* ================= 필터 리셋 ================= */
  const resetFilters = () => {
    setFilters({ sido: "", station: "", type: "" });
    setSelectedSido("");

    setStats((s) => ({
      ...s,
      selectedAreaCount: 0,
    }));
  };

  const changeFilter = (k: keyof Filters, v: string) =>
    setFilters((prev) => ({ ...prev, [k]: v }));

  const topOffset = headerHeight + 14;

  /* ================= 렌더링 ================= */
  return (
    <div className="fixed inset-0 -z-20">
      <div
        className="fixed left-0 right-0 bottom-0 -z-20"
        style={{ top: headerHeight }}
      >
        <div ref={mapRef} className="absolute inset-0" />
      </div>

      {/* 🔥 폴리곤 layer */}
      {map.current && (
        <PolygonLayer
          map={map.current}
          vehicles={data}
          onRegionSelect={handleRegionSelect}
        />
      )}

      {/* 통계 패널 */}
      <MapStatsPanel
        top={topOffset}
        stats={stats}
        selectedSido={selectedSido}
      />

      {/* 필터 패널 */}
      <MapFilterPanel
        top={topOffset}
        data={filtered}
        options={options}
        filters={filters}
        onChangeFilter={changeFilter}
        onReset={resetFilters}
        onRefresh={() =>
          setStats((s) => ({ ...s, visibleCount: filtered.length }))
        }
      />
    </div>
  );
};

export default MapPage;
