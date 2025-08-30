// src/pages/MapPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useKakaoLoader } from "../hooks/useKakaoLoader";
import MapStatsPanel from "../components/map/MapStatsPanel";
import MapFilterPanel from "../components/map/MapFilterPanel";
import type { Filters, MapStats, MarkerBundle, Vehicle } from "../types/map";

/** 예시 데이터 (백엔드 연동 시 교체) */
const SAMPLE_VEHICLES: Vehicle[] = [
  { id: "v1", callname: "포항119-1", sido: "경북", station: "포항소방서", type: "펌프차", personnel: 4, dispatchPlace: "포항시 남구 대이동", lat: 36.016, lng: 129.353, status: "활동" },
  { id: "v2", callname: "구미119-2", sido: "경북", station: "구미소방서", type: "구조차", personnel: 5, dispatchPlace: "구미시 선산읍", lat: 36.21, lng: 128.35, status: "활동" },
  { id: "v3", callname: "강남연삼소펌", sido: "서울", station: "강남소방서", type: "펌프차", personnel: 3, dispatchPlace: "강남구 역삼동", lat: 37.4997, lng: 127.0369, status: "활동" },
  { id: "v4", callname: "인천-구급1", sido: "인천", station: "미추홀소방서", type: "구급차", personnel: 3, dispatchPlace: "미추홀구 주안동", lat: 37.463, lng: 126.679, status: "활동" },
  { id: "v5", callname: "춘천-산불1", sido: "강원", station: "춘천소방서", type: "산불", personnel: 4, dispatchPlace: "춘천시 동면", lat: 37.89, lng: 127.73, status: "활동" },
];

type Props = {
  vehicles?: Vehicle[];
  headerHeight?: number;
};

const MapPage = ({ vehicles: externalVehicles, headerHeight = 44 }: Props) => {
  const kakaoReady = useKakaoLoader();

  const mapRef = useRef<HTMLDivElement | null>(null);
  const map = useRef<kakao.maps.Map | null>(null);
  const geocoder = useRef<kakao.maps.services.Geocoder | null>(null);

  const [filters, setFilters] = useState<Filters>({ sido: "", station: "", type: "" });
  const [stats, setStats] = useState<MapStats>({ visibleCount: 0, selectedAreaCount: 0, totalCount: 0 });
  const [selectedSido, setSelectedSido] = useState("");

  // ⬇️ 2초 자동삭제용 timer 포함
  const dragRef = useRef<{
    dragging: boolean;
    start: kakao.maps.LatLng | null;
    rect: kakao.maps.Rectangle | null;
    timer: number | null;
  }>({ dragging: false, start: null, rect: null, timer: null });

  const markers = useRef<MarkerBundle[]>([]);
  const openedInfo = useRef<kakao.maps.InfoWindow | null>(null);

  const data: Vehicle[] = externalVehicles ?? SAMPLE_VEHICLES;
  const topOffset = useMemo<number>(() => headerHeight + 14, [headerHeight]);

  /** 셀렉트 옵션 */
  const options = useMemo<{ sidos: string[]; stations: string[]; types: string[] }>(() => {
    const sidos = [...new Set(data.map((v) => v.sido))].sort();
    const stations = [...new Set(data.map((v) => v.station))].sort();
    const types = [...new Set(data.map((v) => v.type))].sort();
    return { sidos, stations, types };
  }, [data]);

  /** 필터링 결과 */
  const filtered = useMemo<Vehicle[]>(
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

  /** 지도 생성 */
  useEffect(() => {
    if (!kakaoReady || !mapRef.current) return;
    const k = window.kakao;
    const center = new k.maps.LatLng(36.35, 127.9);
    const m = new k.maps.Map(mapRef.current, { center, level: 12 });
    map.current = m;

    // 컨트롤
    m.addControl(new k.maps.ZoomControl(), k.maps.ControlPosition.RIGHT);
    m.addControl(new k.maps.MapTypeControl(), k.maps.ControlPosition.TOPRIGHT);

    geocoder.current = new k.maps.services.Geocoder();

    // 이벤트 등록
    k.maps.event.addListener(m, "idle", refreshVisibleCount);
    k.maps.event.addListener(m, "click", onMapClickForRegion);
    k.maps.event.addListener(m, "mousedown", onMouseDown);
    k.maps.event.addListener(m, "mousemove", onMouseMove);
    k.maps.event.addListener(m, "mouseup", onMouseUp);

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

  /** 필터 변경 시 마커/통계 갱신 */
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

  /** 마커 & 인포윈도우 */
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
        <div style="min-width:220px;padding:8px 10px;border-radius:8px;background:#fff;border:1px solid #ddd;box-shadow:0 2px 8px rgba(0,0,0,0.12);">
          <div style="font-weight:600;margin-bottom:4px">${v.callname}</div>
          <div style="font-size:12px;line-height:1.5">
            <div><b>시/도</b> ${v.sido} · <b>소방서</b> ${v.station}</div>
            <div><b>차종</b> ${v.type} · <b>인원</b> ${v.personnel}명</div>
            <div><b>출동 장소</b> ${v.dispatchPlace}</div>
          </div>
        </div>`;
      const info = new k.maps.InfoWindow({ content });

      k.maps.event.addListener(marker, "mouseover", () => {
        if (openedInfo.current) openedInfo.current.close();
        info.open(m, marker);
        openedInfo.current = info;
      });

      markers.current.push({ marker, info, data: v });
    });
  }

  /** 화면 내 차량 수 */
  function refreshVisibleCount() {
    const m = map.current;
    if (!m) return;
    const b = m.getBounds();
    const c = markers.current.filter((mk) => b.contain(mk.marker.getPosition())).length;
    setStats((s) => ({ ...s, visibleCount: c }));
  }

  /** region_1depth_name(시/도) 안전 추출 */
  function pickRegion1Depth(res: kakao.maps.services.RegionResult[]): string | undefined {
    const byH = res.find((r) => r.region_type === "H");
    const byB = res.find((r) => r.region_type === "B");
    const byS = res.find((r) => r.region_type === "S");
    return byH?.region_1depth_name ?? byB?.region_1depth_name ?? byS?.region_1depth_name ?? res[0]?.region_1depth_name;
  }

  /** 지도 클릭 → 역지오코딩으로 시/도 통계 */
  function onMapClickForRegion(e?: kakao.maps.event.MapMouseEvent) {
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

  /** 드래그 범위 선택 (2초 자동 삭제) */
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

    // 자동삭제 타이머가 걸려있다면 정리하고 즉시 삭제(원하면 유지 가능)
    if (d.timer) {
      clearTimeout(d.timer);
      d.timer = null;
    }
    if (d.rect) {
      d.rect.setMap(null);
    }

    dragRef.current = { dragging: false, start: null, rect: null, timer: null };
  }

  /** 필터 핸들러 */
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

  return (
    <div className="fixed inset-0 -z-20">
      {/* 지도 */}
      <div className="fixed left-0 right-0 bottom-0 -z-20" style={{ top: headerHeight }}>
        <div ref={mapRef} className="absolute inset-0" />
      </div>

      {/* 좌측 상단 통계 */}
      <MapStatsPanel top={topOffset} stats={stats} selectedSido={selectedSido} />

      {/* 우측 상단 필터 */}
      <MapFilterPanel
        top={topOffset}
        data={data}
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
