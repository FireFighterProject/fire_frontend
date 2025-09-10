// src/data/logs.ts
export type ActivityLog = {
    id: string;
    vehicleId: string;     // src/data/vehicles.ts 에 정의된 DUMMY_VEHICLES의 id와 매칭 (예: v-001)
    date: string;          // yyyy-MM-dd
    dispatchTime: string;  // yyyy-MM-dd HH:mm
    dispatchPlace: string;
    returnTime: string;
    command: string;
    moved: boolean;
    minutes: number;
    crewCount: number;
};

// DUMMY_VEHICLES 의 id (v-001 ~) 에 맞춰 샘플 작성
export const DUMMY_LOGS: ActivityLog[] = [
    { id: "a1", vehicleId: "v-001", date: "2025-08-30", dispatchTime: "2025-08-30 09:13", dispatchPlace: "포항 남구 대이동", returnTime: "2025-08-30 10:40", command: "화재진압", moved: false, minutes: 87, crewCount: 4 },
    { id: "a2", vehicleId: "v-001", date: "2025-08-29", dispatchTime: "2025-08-29 14:01", dispatchPlace: "포항 북구 양덕동", returnTime: "2025-08-29 14:55", command: "구조지원", moved: true, minutes: 54, crewCount: 4 },
    { id: "a3", vehicleId: "v-002", date: "2025-08-28", dispatchTime: "2025-08-28 20:20", dispatchPlace: "구미 선산읍", returnTime: "2025-08-28 21:50", command: "구조출동", moved: false, minutes: 90, crewCount: 5 },
    { id: "a4", vehicleId: "v-005", date: "2025-08-30", dispatchTime: "2025-08-30 11:05", dispatchPlace: "서울 영등포구", returnTime: "2025-08-30 12:05", command: "화재진압", moved: false, minutes: 60, crewCount: 3 },
    { id: "a5", vehicleId: "v-006", date: "2025-08-30", dispatchTime: "2025-08-30 16:30", dispatchPlace: "인천 연수구", returnTime: "2025-08-30 17:50", command: "구급지원", moved: true, minutes: 80, crewCount: 2 },
    { id: "a6", vehicleId: "v-008", date: "2025-08-29", dispatchTime: "2025-08-29 08:00", dispatchPlace: "부산 해운대구", returnTime: "2025-08-29 10:40", command: "훈련", moved: false, minutes: 160, crewCount: 3 },
    { id: "a7", vehicleId: "v-008", date: "2025-08-27", dispatchTime: "2025-08-27 13:15", dispatchPlace: "부산 해운대구 좌동", returnTime: "2025-08-27 14:10", command: "화재진압", moved: false, minutes: 55, crewCount: 3 },
    { id: "a8", vehicleId: "v-002", date: "2025-08-25", dispatchTime: "2025-08-25 07:40", dispatchPlace: "구미 인동", returnTime: "2025-08-25 08:25", command: "구급지원", moved: false, minutes: 45, crewCount: 5 },
    { id: "a9", vehicleId: "v-004", date: "2025-08-24", dispatchTime: "2025-08-24 18:10", dispatchPlace: "서울 강남구", returnTime: "2025-08-24 19:00", command: "구조출동", moved: true, minutes: 50, crewCount: 4 },
    { id: "a10", vehicleId: "v-004", date: "2025-08-22", dispatchTime: "2025-08-22 12:00", dispatchPlace: "서울 강남구 역삼동", returnTime: "2025-08-22 13:10", command: "훈련", moved: false, minutes: 70, crewCount: 4 },
    { id: "a11", vehicleId: "v-001", date: "2025-08-21", dispatchTime: "2025-08-21 09:40", dispatchPlace: "포항 남구 청림동", returnTime: "2025-08-21 10:28", command: "구급지원", moved: false, minutes: 48, crewCount: 4 },
];
