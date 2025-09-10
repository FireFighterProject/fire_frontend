// src/pages/ActivityPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import ActivitySummary from "../components/Activity/ActivitySummary";
import ActivityFilter from "../components/Activity/ActivityFilter";
import ActivityTable from "../components/Activity/ActivityTable";

import type { RootState, AppDispatch } from "../store";
import { setVehicles, updateVehicle } from "../features/vehicle/vehicleSlice";
import { DUMMY_VEHICLES } from "../data/vehicles"; // ✅ 공통 목데이터 한 곳에서만 관리

/**
 * ActivityPage
 * - 전역 Redux의 vehicle 리스트를 기준으로 활동(출동) 현황을 보여주는 페이지
 * - 이 페이지에서는 필터 UI(시/도, 차종)만 로컬 상태로 관리하고,
 *   차량 데이터 변경은 반드시 Redux 액션으로 수행한다.
 */
const ActivityPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  /* ----------------------- 전역 차량 목록 ----------------------- */
  const vehicles = useSelector((s: RootState) => s.vehicle.vehicles);

  /**
   * 데모/초기 구동 편의:
   * - 스토어가 비어있으면 공통 목데이터를 한 번만 주입
   * - 실제 서비스에선 App 레벨에서 fetch 후 setVehicles(...) 호출을 권장
   */
  useEffect(() => {
    if (vehicles.length === 0) {
      dispatch(setVehicles(DUMMY_VEHICLES));
    }
  }, [vehicles.length, dispatch]);

  /* ----------------------- 로컬 필터 상태 ----------------------- */
  // 필요 이상으로 전역화할 필요가 없는 UI 전용 상태는 로컬로 유지
// src/pages/Activity.tsx 또는 ActivityPage.tsx
const [filter, setFilter] = useState({ sido: "전체", type: "전체", query: "" }); // ✅ query 추가

// 필터링 로직에도 query 반영
const filtered = useMemo(() => {
  const q = filter.query.trim();
  return vehicles.filter((v) => {
    if (filter.sido !== "전체" && v.sido !== filter.sido) return false;
    if (filter.type !== "전체" && v.type !== filter.type) return false;
    if (q) {
      const hay = `${v.callname} ${v.station} ${v.type} ${v.sido}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });
}, [vehicles, filter]);


  /* ----------------------- 활동 차량만 ----------------------- */
  const activeVehicles = useMemo(() => {
    // 기본: status === "활동" 만 포함
    // 출동중도 활동으로 간주하려면 아래 라인으로 교체:
    return filtered.filter((v) => v.status === "활동" || v.status === "출동중");
    // return filtered.filter((v) => v.status === "활동");
  }, [filtered]);

  /* ----------------------- 이벤트 핸들러 ----------------------- */
  // 복귀 처리 → 전역 상태 업데이트
  const handleReturn = (id: string) => {
    dispatch(updateVehicle({ id, patch: { status: "대기" } }));
  };

  // 장소 이동 (지도 모달과 연동 시 relocate 액션을 slice에 추가해 사용 권장)
  const handleRelocate = (id: string) => {
    alert(`${id} 차량 장소 이동 처리`);
    // 예) dispatch(relocate({ id, dispatchPlace: "새 주소", lat, lng }));
  };

  /* ----------------------- 렌더 ----------------------- */
  return (
    <div style={{ padding: 20 }}>
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
