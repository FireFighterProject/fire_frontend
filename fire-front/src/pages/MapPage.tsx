// src/pages/MapPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useKakaoLoader } from "../hooks/useKakaoLoader";

import DragSelectLayer from "../components/map/DragSelectLayer";
import MapStatsPanel from "../components/map/MapStatsPanel";
import MapFilterPanel from "../components/map/MapFilterPanel";
import PolygonLayer from "../components/map/PolygonLayer";

import type { RootState } from "../store";
import type {
  Filters,
  MapStats,
  MarkerBundle,
  MapVehicle,
} from "../types/map";


// ===================== GPS API 타입 =====================
type ApiGps = {
  vehicleId: number;
  latitude: number;
  longitude: number;
  updatedAt?: string;
  heading?: number;
  speedKph?: number;
};

type ApiLastLocation = ApiGps;

type Props = {
  vehicles?: MapVehicle[];
  headerHeight?: number;
};

const API_BASE = "/api";
const POLL_MS = 5000;


// ===================== 공통 함수 =====================
const isValidCoord = (lat?: number, lng?: number): boolean =>
  typeof lat === "number" &&
  typeof lng === "number" &&
  !(lat === 0 && lng === 0);

function normalizeStatus(raw: unknown): MapVehicle["status"] {
  if (raw === null || raw === undefined) return "기타";

  if (typeof raw === "number") {
    return raw === 0 ? "대기" :
      raw === 1 ? "활동" :
        raw === 2 ? "철수" : "기타";
  }

  const s = String(raw).trim();
  if (s.includes("활동") || s.includes("출동")) return "활동";
  if (s.includes("대기")) return "대기";
  if (s.includes("철수") || s.includes("복귀")) return "철수";

  return "기타";
}



// ===================== GPS + 차량 merge =====================
function buildMapVehicles(
  last: ApiLastLocation[],
  storeVehicles: MapVehicle[]
): MapVehicle[] {
  // 🔍 1) 원본 데이터 로그
  console.log(
    "[MAP] GPS lastLocs:",
    last.map((g) => ({
      vehicleId: g.vehicleId,
      lat: g.latitude,
      lng: g.longitude,
      updatedAt: g.updatedAt,
    }))
  );
  console.log(
    "[MAP] storeVehicles ids:",
    storeVehicles.map((v) => v.id)
  );

  const byId = new Map<number, MapVehicle>(
    storeVehicles.map((v) => [Number(v.id), v])
  );

  const result = last
    .map((l) => {
      const id = Number(l.vehicleId);
      const base = byId.get(id);

      if (!base) {
        console.warn(
          "[MAP] GPS vehicleId에 해당하는 차량 없음 (storeVehicles 미존재)",
          { vehicleId: l.vehicleId }
        );
        return null;
      }

      if (!isValidCoord(l.latitude, l.longitude)) {
        console.warn("[MAP] 좌표 무효, 스킵:", {
          vehicleId: l.vehicleId,
          lat: l.latitude,
          lng: l.longitude,
        });
        return null;
      }

      const mapped: MapVehicle = {
        id: base.id,
        callname: String(
          base.callname ??
          (base as any).callSign ??
          (base as any).name ??
          `V-${l.vehicleId}`
        ),
        sido: String(base.sido ?? ""),
        station: String((base as any).station ?? (base as any).stationName ?? ""),
        type: String(base.type ?? (base as any).typeName ?? ""),
        personnel: Number(base.personnel) || 0,
        dispatchPlace: (base as any).dispatchPlace ?? "",
        lat: l.latitude,
        lng: l.longitude,
        status: normalizeStatus(base.status),
        heading: l.heading ?? 0,
        speedKph: l.speedKph ?? 0,
      };

      console.log("[MAP] 파싱된 차량:", {
        vehicleId: l.vehicleId,
        joinedId: mapped.id,
        callname: mapped.callname,
        sido: mapped.sido,
        station: mapped.station,
        type: mapped.type,
      });

      return mapped;
    })
    .filter((v): v is MapVehicle => v !== null);

  console.log(
    `[MAP] buildMapVehicles 결과: GPS ${last.length}대 → 매핑된 차량 ${result.length}대`
  );

  return result;
}




// ===================== MapPage Component =====================
const MapPage = ({ vehicles: externalVehicles, headerHeight = 44 }: Props) => {
  const kakaoReady = useKakaoLoader();

  // 🔥 Redux 차량
  const storeVehicles = useSelector((s: RootState) => s.vehicle.vehicles) as MapVehicle[];

  // 🔥 GPS 데이터
  const [lastLocs, setLastLocs] = useState<ApiLastLocation[]>([]);

  // 🔥 UI 상태
  const [selectedSido, setSelectedSido] = useState("");

  const [stats, setStats] = useState<MapStats>({
    visibleCount: 0,
    selectedAreaCount: 0,
    dragAreaCount: 0,
    totalCount: 0,
  });

  const [filters, setFilters] = useState<Filters>({
    sido: "",
    station: "",
    type: "",
  });

  // 지도 요소
  const mapRef = useRef<HTMLDivElement | null>(null);
  const map = useRef<kakao.maps.Map | null>(null);
  const markers = useRef<MarkerBundle[]>([]);
  const openedInfo = useRef<kakao.maps.InfoWindow | null>(null);


  // ===================== GPS polling =====================
  useEffect(() => {
    const abort = new AbortController();

    const fetchGps = async () => {
      try {
        const res = await fetch(`${API_BASE}/gps/all`, {
          headers: { accept: "*/*" },
          signal: abort.signal,
        });

        if (!res.ok) throw new Error("GPS fetch error");

        const data: ApiGps[] = await res.json();
        setLastLocs(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("GPS fetch 실패:", err);
        }
      }
    };

    fetchGps();
    const intervalId = setInterval(fetchGps, POLL_MS);

    return () => {
      abort.abort();
      clearInterval(intervalId);
    };
  }, []);



  // ===================== GPS + 차량 merge =====================
  const joinedVehicles = useMemo(() => {
    const merged = buildMapVehicles(lastLocs, storeVehicles);
    console.log(
      "[MAP] joinedVehicles (GPS+차량 merge 결과) 개수:",
      merged.length,
      "ids:",
      merged.map((v) => v.id)
    );
    return merged;
  }, [lastLocs, storeVehicles]);


  // ===================== 최종 차량 데이터 =====================
  const data: MapVehicle[] = useMemo(() => {
    if (externalVehicles?.length) return externalVehicles;
    if (joinedVehicles.length) return joinedVehicles;

    const safeVehicles = storeVehicles
      .filter((v) => v && isValidCoord(v.lat, v.lng))
      .map((v): MapVehicle => ({
        ...v,
        lat: v.lat ?? 0,
        lng: v.lng ?? 0,
        status: normalizeStatus(v.status),
      }));

    return safeVehicles;
  }, [externalVehicles, joinedVehicles, storeVehicles]);



  // ===================== 필터 처리 =====================
  const filtered = useMemo(() => {
    return data
      .filter((v) => v.status !== "대기")
      .filter(
        (v) =>
          (!filters.sido || v.sido === filters.sido) &&
          (!filters.station || v.station === filters.station) &&
          (!filters.type || v.type === filters.type)
      );
  }, [data, filters]);




  // ===================== 필터 옵션 =====================
  const options = useMemo(() => {
    const sidos = [...new Set(data.map((v) => v.sido))].sort();
    const stations = [...new Set(data.map((v) => v.station))].sort();
    const types = [...new Set(data.map((v) => v.type))].sort();
    return { sidos, stations, types };
  }, [data]);



  // ===================== 지도 초기화 =====================
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
  }, [kakaoReady]);



  // ===================== 마커 렌더링 =====================
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

    const redDot = new kakao.maps.MarkerImage(
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14">
          <circle cx="7" cy="7" r="5" fill="#ff2a2a" />
        </svg>
      `),
      new kakao.maps.Size(14, 14),
      { offset: new kakao.maps.Point(7, 7) }
    );

    // 🔍 실제로 지도에 찍히는 차량들
    console.log(
      "[MAP] 지도에 마커 찍히는 filtered 차량:",
      filtered.length,
      filtered.map((v) => ({
        id: v.id,
        callname: v.callname,
        sido: v.sido,
        station: v.station,
        type: v.type,
        lat: v.lat,
        lng: v.lng,
      }))
    );

    filtered.forEach((v) => {
      const pos = new kakao.maps.LatLng(v.lat, v.lng);
      const marker = new kakao.maps.Marker({
        map: map.current!,
        position: pos,
        image: redDot,
      });
      // ...
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
  }, [filtered, kakaoReady, data.length]);



  // ===================== 지역 클릭 =====================
  const handleRegionSelect = (regionName: string, regionData: MapVehicle[]) => {
    setSelectedSido(regionName);

    setStats((s) => ({
      ...s,
      selectedAreaCount: regionData.length,
    }));
  };


  // ===================== 필터 리셋 =====================
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



  // ===================== 렌더링 =====================
  const topOffset = headerHeight + 14;

  return (
    <div className="fixed inset-0 -z-20">
      <div
        className="fixed left-0 right-0 bottom-0 -z-20"
        style={{ top: headerHeight }}
      >
        <div ref={mapRef} className="absolute inset-0" />
      </div>

      {map.current && (
        <PolygonLayer
          map={map.current}
          vehicles={data}
          onRegionSelect={handleRegionSelect}
        />
      )}

      {map.current && (
        <DragSelectLayer
          map={map.current}
          vehicles={data}
          onSelect={(selected) => {
            setStats((s) => ({
              ...s,
              dragAreaCount: selected.length,
            }));
          }}
        />
      )}

      <MapStatsPanel
        top={topOffset}
        stats={stats}
        selectedSido={selectedSido}
      />

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
