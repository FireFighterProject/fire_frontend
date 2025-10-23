// src/pages/MapPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useKakaoLoader } from "../hooks/useKakaoLoader";
import MapStatsPanel from "../components/map/MapStatsPanel";
import MapFilterPanel from "../components/map/MapFilterPanel";
import type { Vehicle } from "../types/global";
import type { RootState } from "../store";
import type {
  Filters,
  MapStats,
  MarkerBundle,
  Vehicle as MapVehicle,
} from "../types/map";

/**
 * MapPage
 * - /api/gps/last-locations 로 받은 최신 좌표를 전역 vehicle 메타정보와 조인하여 지도에 표시
 * - 데이터 소스 우선순위:
 *   1) props.vehicles (Map 전용 Vehicle: lat/lng 포함)  ← 외부 주입시 최우선
 *   2) last-locations + 전역 vehicles 조인 결과
 *   3) (폴백) 전역 vehicles 중 lat/lng 이미 포함된 항목
 */

// =======================
// API & 유틸
// =======================

type ApiLastLocation = {
  vehicleId: number;
  latitude: number;
  longitude: number;
  heading: number;
  speedKph: number;
};

type Props = {
  /** 지도에 바로 그릴 수 있는 차량 목록(좌표 포함). 주면 최우선으로 사용 */
  vehicles?: MapVehicle[];
  /** 상단 고정 헤더 높이(픽셀). 레이아웃에 따라 보정 */
  headerHeight?: number;
};

// 🔑 환경설정 (필요시 .env로 분리)
const API_BASE = "http://172.28.2.191:8081";
const POLL_MS = 5000; // 5초마다 최신 좌표 폴링

// 0,0 좌표(유효치 아님) 제외
const isValidCoord = (lat?: number, lng?: number) =>
  typeof lat === "number" &&
  typeof lng === "number" &&
  !(lat === 0 && lng === 0);

// =======================
// 상태 정규화
// =======================
function normalizeStatus(raw: unknown): string {
  if (raw === null || raw === undefined) return "기타";

  // 숫자 코드 (0=대기, 1=활동, 2=철수)
  if (typeof raw === "number") {
    if (raw === 0) return "대기";
    if (raw === 1) return "활동"; // 🔥 출동중 → 활동으로 맞춤
    if (raw === 2) return "철수";
    return "기타";
  }

  const s = String(raw).trim().toLowerCase();

  if (["출동", "출동중", "활동", "dispatch", "active"].some(k => s.includes(k)))
    return "활동"; // 🔥 지도에서 렌더되는 상태값

  if (["대기", "idle", "standby", "waiting"].some(k => s.includes(k)))
    return "대기";

  if (["철수", "복귀", "return", "returned"].some(k => s.includes(k)))
    return "철수";

  return "기타";
}

// =======================
// 조인 빌더
// =======================
function buildMapVehicles(
  last: ApiLastLocation[],
  storeVehicles: Vehicle[]
): MapVehicle[] {
  const byId = new Map<number, Vehicle>(storeVehicles.map(v => [Number(v.id), v]));
  return last
    .map(l => {
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

      // heading/speedKph은 추가 속성이라 아래처럼 캐스팅
      (mapped as MapVehicle & { heading?: number; speedKph?: number }).heading = l.heading;
      (mapped as MapVehicle & { heading?: number; speedKph?: number }).speedKph = l.speedKph;

      return mapped;
    })
    .filter(Boolean) as MapVehicle[];
}

const MapPage = ({ vehicles: externalVehicles, headerHeight = 44 }: Props) => {
  const kakaoReady = useKakaoLoader();

  // -----------------------------
  // 데이터 소스: Redux 전역 vehicles
  // -----------------------------
  const storeVehicles = useSelector((s: RootState) => s.vehicle.vehicles);

  // -----------------------------
  // 최신 좌표 상태 + 쿼리 파라미터
  // -----------------------------
  const [lastLocs, setLastLocs] = useState<ApiLastLocation[]>([]);
  const [queryParams] = useState(() => {
    const sp = new URLSearchParams(window.location.search);
    const stationId = sp.get("stationId");
    const vehicleIds = sp.getAll("vehicleIds"); // ?vehicleIds=1&vehicleIds=8
    return { stationId, vehicleIds };
  });

  // 좌표 폴링
  useEffect(() => {
    let abort = new AbortController();

    async function fetchLast() {
      try {
        const qs = new URLSearchParams();
        if (queryParams.vehicleIds?.length) {
          queryParams.vehicleIds.forEach((v) => qs.append("vehicleIds", String(v)));
        } else {
          qs.set("stationId", String(queryParams.stationId ?? 1));
        }

        const res = await fetch(`${API_BASE}/api/gps/last-locations?${qs}`, {
          headers: { accept: "*/*" },
          signal: abort.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ApiLastLocation[] = await res.json();
        setLastLocs(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("last-locations fetch 실패:", e);
        }
      }
    }

    // 즉시 1회 + 폴링
    fetchLast();
    const t = setInterval(fetchLast, POLL_MS);

    return () => {
      abort.abort();
      clearInterval(t);
    };
  }, [queryParams.stationId, queryParams.vehicleIds]);

  // last-locations 조인 결과
  const joinedVehicles = useMemo(
    () => buildMapVehicles(lastLocs, storeVehicles as any[]),
    [lastLocs, storeVehicles]
  );

  // -----------------------------
  // 지도에 사용할 최종 데이터
  // -----------------------------
  const data: MapVehicle[] = useMemo(() => {
    if (externalVehicles?.length) return externalVehicles;
    if (joinedVehicles.length) return joinedVehicles;

    // (폴백) 전역 vehicle 중 lat/lng 이미 들어있는 경우
    return (storeVehicles as any[])
      .filter(
        (v) =>
          v &&
          typeof v.lat === "number" &&
          typeof v.lng === "number" &&
          typeof v.callname === "string" &&
          isValidCoord(v.lat, v.lng)
      )
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

  // -----------------------------
  // UI 상태
  // -----------------------------
  const [filters, setFilters] = useState<Filters>({ sido: "", station: "", type: "" });
  const [stats, setStats] = useState<MapStats>({ visibleCount: 0, selectedAreaCount: 0, totalCount: 0 });
  const [selectedSido, setSelectedSido] = useState("");

  // kakao 객체/지도/지오코더/마커 상태
  const mapRef = useRef<HTMLDivElement | null>(null);
  const map = useRef<kakao.maps.Map | null>(null);
  const geocoder = useRef<kakao.maps.services.Geocoder | null>(null);
  const markers = useRef<MarkerBundle[]>([]);
  const openedInfo = useRef<kakao.maps.InfoWindow | null>(null);

  // 드래그 선택 박스 상태(2초 자동 삭제 타이머 포함)
  const dragRef = useRef<{
    dragging: boolean;
    start: kakao.maps.LatLng | null;
    rect: kakao.maps.Rectangle | null;
    timer: number | null;
  }>({ dragging: false, start: null, rect: null, timer: null });

  // 레이아웃 보정(패널 위치)
  const topOffset = useMemo<number>(() => headerHeight + 14, [headerHeight]);

  // 셀렉트 옵션
  const options = useMemo<{ sidos: string[]; stations: string[]; types: string[] }>(() => {
    const sidos = [...new Set(data.map((v) => v.sido))].sort();
    const stations = [...new Set(data.map((v) => v.station))].sort();
    const types = [...new Set(data.map((v) => v.type))].sort();
    return { sidos, stations, types };
  }, [data]);

  // 필터링 결과 (지도는 '출동중'만 표시)
  const filtered = useMemo<MapVehicle[]>(
    () =>
      data.filter(
        (v) =>
          v.status === "활동" &&
          (!filters.sido || v.sido === filters.sido) &&
          (!filters.station || v.station === filters.station) &&
          (!filters.type || v.type === filters.type)
      ),
    [data, filters]
  );

  // -----------------------------
  // 지도 생성/이벤트 등록
  // -----------------------------
  useEffect(() => {
    if (!kakaoReady || !mapRef.current) return;
    const k = window.kakao;
    const center = new k.maps.LatLng(36.35, 127.9);
    const m = new k.maps.Map(mapRef.current, { center, level: 12 });
    map.current = m;

    // 지도 컨트롤
    m.addControl(new k.maps.ZoomControl(), k.maps.ControlPosition.RIGHT);
    m.addControl(new k.maps.MapTypeControl(), k.maps.ControlPosition.TOPRIGHT);

    geocoder.current = new k.maps.services.Geocoder();

    // 이벤트 등록
    k.maps.event.addListener(m, "idle", refreshVisibleCount);
    k.maps.event.addListener(m, "click", onMapClickForRegion);
    k.maps.event.addListener(m, "mousedown", onMouseDown);
    k.maps.event.addListener(m, "mousemove", onMouseMove);
    k.maps.event.addListener(m, "mouseup", onMouseUp);

    // 최초 총량 반영
    setStats((s) => ({ ...s, totalCount: filtered.length }));

    return () => {
      // 정리: 타이머/사각형 제거
      if (dragRef.current.timer) {
        clearTimeout(dragRef.current.timer);
        dragRef.current.timer = null;
      }
      if (dragRef.current.rect) {
        dragRef.current.rect.setMap(null);
        dragRef.current.rect = null;
      }

      k.maps.event.removeListener(m, "idle", refreshVisibleCount);
      k.maps.event.removeListener(m, "click", onMapClickForRegion);
      k.maps.event.removeListener(m, "mousedown", onMouseDown);
      k.maps.event.removeListener(m, "mousemove", onMouseMove);
      k.maps.event.removeListener(m, "mouseup", onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kakaoReady]);

  // 필터/데이터 변경 시 마커/통계 갱신
  useEffect(() => {
    if (!map.current || !kakaoReady) return;
    drawMarkers();
    refreshVisibleCount();
    setStats((s) => ({
      ...s,
      totalCount: filtered.length,
      selectedAreaCount: selectedSido ? filtered.filter((v) => v.sido === selectedSido).length : s.selectedAreaCount,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, kakaoReady]);

  // -----------------------------
  // 마커 & 인포윈도우
  // -----------------------------
  function clearMarkers() {
    markers.current.forEach((m) => {
      m.marker.setMap(null);
      if (m.info) m.info.close();
    });
    markers.current = [];
    openedInfo.current = null;
  }

  function drawMarkers() {
    const m = map.current;
    if (!m) return;
    clearMarkers();
    const k = window.kakao;

    filtered.forEach((v) => {
      const pos = new k.maps.LatLng(v.lat, v.lng);
      const marker = new k.maps.Marker({ map: m, position: pos });

      const content = `
        <div style="min-width:220px;padding:8px 10px;border-radius:8px;background:#fff;border:0;box-shadow:0 2px 8px rgba(0,0,0,0.12);">
          <div style="font-weight:600;margin-bottom:4px">${v.callname}</div>
          <div style="font-size:12px;line-height:1.5">
            <div><b>시/도</b> ${v.sido} · <b>소방서</b> ${v.station}</div>
            <div><b>차종</b> ${v.type} · <b>인원</b> ${v.personnel}명</div>
            <div><b>출동 장소</b> ${v.dispatchPlace ?? "-"}</div>
            ${typeof (v as any).speedKph === "number" ? `<div><b>속도</b> ${(v as any).speedKph} km/h</div>` : ""}
            ${typeof (v as any).heading === "number" ? `<div><b>방향</b> ${(v as any).heading}°</div>` : ""}
          </div>
        </div>`.trim();

      const info = new k.maps.InfoWindow({ content });

      // 클릭 토글
      k.maps.event.addListener(marker, "click", () => {
        if (openedInfo.current === info) {
          info.close();
          openedInfo.current = null;
          return;
        }
        if (openedInfo.current) openedInfo.current.close();
        info.open(m, marker);
        openedInfo.current = info;
      });

      markers.current.push({ marker, info, data: v });
    });
  }

  // 화면 내 차량 수 (idle 등에서 호출)
  function refreshVisibleCount() {
    const m = map.current;
    if (!m) return;
    const b = m.getBounds();
    const c = markers.current.filter((mk) => b.contain(mk.marker.getPosition())).length;
    setStats((s) => ({ ...s, visibleCount: c }));
  }

  // region_1depth_name(시/도) 안전 추출
  function pickRegion1Depth(res: kakao.maps.services.RegionResult[]): string | undefined {
    const byH = res.find((r) => r.region_type === "H");
    const byB = res.find((r) => r.region_type === "B");
    const byS = res.find((r) => r.region_type === "S");
    return byH?.region_1depth_name ?? byB?.region_1depth_name ?? byS?.region_1depth_name ?? res[0]?.region_1depth_name;
  }

  // 지도 클릭 → 역지오코딩으로 시/도 별 카운트
  function onMapClickForRegion(e?: kakao.maps.event.MapMouseEvent) {
    // 지도를 클릭하면 열린 인포윈도우 닫기
    if (openedInfo.current) {
      openedInfo.current.close();
      openedInfo.current = null;
    }
    if (!e) return;
    const g = geocoder.current;
    if (!g) return;
    const { latLng } = e;

    g.coord2RegionCode(
      latLng.getLng(),
      latLng.getLat(),
      (res: kakao.maps.services.RegionResult[], status: kakao.maps.services.Status) => {
        if (status !== window.kakao.maps.services.Status.OK || !res?.length) return;
        const sido = pickRegion1Depth(res);
        if (!sido) return;
        setSelectedSido(sido);
        const cnt = filtered.filter((v) => v.sido === sido).length;
        setStats((s) => ({ ...s, selectedAreaCount: cnt }));
      }
    );
  }

  // 드래그 범위 선택(2초 자동 삭제)
  function onMouseDown(e?: kakao.maps.event.MapMouseEvent) {
    if (!e) return;
    const m = map.current;
    if (!m) return;
    const k = window.kakao;
    const start = e.latLng;

    // 기존 타이머/사각형 정리
    if (dragRef.current.timer) {
      clearTimeout(dragRef.current.timer);
      dragRef.current.timer = null;
    }
    if (dragRef.current.rect) {
      dragRef.current.rect.setMap(null);
      dragRef.current.rect = null;
    }

    const rect = new k.maps.Rectangle({
      map: m,
      bounds: new k.maps.LatLngBounds(start, start),
      strokeWeight: 2,
      strokeColor: "#2f81f7",
      strokeOpacity: 0.9,
      strokeStyle: "shortdash",
      fillColor: "#2f81f7",
      fillOpacity: 0.1,
    });

    // 2초 후 자동 제거
    const timerId = window.setTimeout(() => {
      rect.setMap(null);
      dragRef.current = { dragging: false, start: null, rect: null, timer: null };
    }, 2000);

    dragRef.current = { dragging: true, start, rect, timer: timerId };
  }

  function onMouseMove(e?: kakao.maps.event.MapMouseEvent) {
    if (!e) return;
    const d = dragRef.current;
    if (!d.dragging || !d.rect || !d.start) return;
    const k = window.kakao;
    const sw = new k.maps.LatLng(
      Math.min(d.start.getLat(), e.latLng.getLat()),
      Math.min(d.start.getLng(), e.latLng.getLng())
    );
    const ne = new k.maps.LatLng(
      Math.max(d.start.getLat(), e.latLng.getLat()),
      Math.max(d.start.getLng(), e.latLng.getLng())
    );
    d.rect.setBounds(new k.maps.LatLngBounds(sw, ne));
  }

  function onMouseUp() {
    const d = dragRef.current;
    if (!d.dragging) return;

    if (d.rect) {
      const bounds = d.rect.getBounds();
      const cnt = markers.current.filter((m) => bounds.contain(m.marker.getPosition())).length;
      setStats((s) => ({ ...s, selectedAreaCount: cnt }));
      setSelectedSido("");
    }

    // 자동삭제 타이머 정리 및 즉시 삭제
    if (d.timer) {
      clearTimeout(d.timer);
      d.timer = null;
    }
    if (d.rect) {
      d.rect.setMap(null);
    }

    dragRef.current = { dragging: false, start: null, rect: null, timer: null };
  }

  // -----------------------------
  // 필터 핸들러
  // -----------------------------
  const changeFilter = (k: keyof Filters, v: string) => {
    setFilters((prev) => ({ ...prev, [k]: v, ...(k === "sido" ? { station: "" } : {}) }));
    setSelectedSido("");
    setStats((s) => ({ ...s, selectedAreaCount: 0 }));
  };

  const resetFilters = () => {
    setFilters({ sido: "", station: "", type: "" });
    setSelectedSido("");
    setStats((s) => ({ ...s, selectedAreaCount: 0 }));
    refreshVisibleCount();
  };

  // -----------------------------
  // 렌더
  // -----------------------------
  return (
    <div className="fixed inset-0 -z-20">
      {/* 지도 */}
      <div className="fixed left-0 right-0 bottom-0 -z-20" style={{ top: headerHeight }}>
        <div ref={mapRef} className="absolute inset-0" />
      </div>

      {/* 좌측 상단 통계 */}
      <MapStatsPanel top={topOffset} stats={stats} selectedSido={selectedSido} />

      {/* 우측 상단 필터 (필터 결과 기준으로 카운트/리스트 표시) */}
      <MapFilterPanel
        top={topOffset}
        data={filtered}
        options={options}
        filters={filters}
        onChangeFilter={changeFilter}
        onReset={resetFilters}
        onRefresh={refreshVisibleCount}
      />
    </div>
  );
};

export default MapPage;
