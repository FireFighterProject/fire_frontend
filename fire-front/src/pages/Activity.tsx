// src/pages/ActivityPage.tsx
import React, { useMemo, useState } from "react";
import type{ Vehicle } from "../types/global";
import ActivitySummary from "../components/Activity/ActivitySummary";
import ActivityFilter from "../components/Activity/ActivityFilter";
import ActivityTable from "../components/Activity/ActivityTable";

// 샘플 데이터 (Redux/백엔드 연동 가능)
const SAMPLE: Vehicle[] = [
  {
    id: "1",
    sido: "경북",
    station: "포항소방서",
    type: "구조",
    callname: "포항-구조1",
    capacity: "1500",
    personnel: "5",
    avl: "000-1111",
    pslte: "111-2222",
    status: "활동",
  },
  {
    id: "2",
    sido: "서울",
    station: "강남소방서",
    type: "펌프",
    callname: "강남-펌프2",
    capacity: "2000",
    personnel: "4",
    avl: "222-3333",
    pslte: "333-4444",
    status: "대기",
  },
];

const ActivityPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(SAMPLE);
  const [filter, setFilter] = useState({ sido: "전체", type: "전체" });

  // ✅ 활동 차량만 필터링
  const activeVehicles = useMemo(
    () => vehicles.filter((v) => v.status === "활동"),
    [vehicles]
  );

  // ✅ 복귀 처리
  const handleReturn = (id: string) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "대기" } : v))
    );
  };

  // ✅ 장소 이동
  const handleRelocate = (id: string) => {
    alert(`${id} 차량 장소 이동 처리`);
    // 지도 모달 띄워서 새 출동 명령 로직 연결
  };

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
