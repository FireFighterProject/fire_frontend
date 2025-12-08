// src/types/stats.ts

// 백엔드 /api/logs 원본 이벤트 한 건
export type RawLogEvent = {
    id: number;
    vehicleId: number;
    orderId: number;
    batchNo: number;
    eventType: string;
    address: string;
    content: string;
    memo: string;
    eventTime: string; // ISO 문자열
};

// 통계 탭들이 쓰기 편하도록
// (vehicleId + orderId 단위로 묶어서) 한 "출동 활동"으로 만든 타입
export type StatLog = {
    id: number;
    vehicleId: number;
    orderId: number;
    date: string;           // yyyy-MM-dd (eventTime에서 잘라낸 것)
    dispatchTime: string;   // 활동 시작 시각 (최초 eventTime)
    returnTime: string;     // 활동 종료 시각 (최후 eventTime)
    dispatchPlace: string;  // 대표 출동 장소 (첫 이벤트 address)
    moved: boolean;         // 이벤트가 2개 이상 있으면 true
    minutes: number;        // 활동 시간(분) = 마지막 - 처음 eventTime 차이
    command: string;        // 대표 내용 (첫 이벤트 content)
    crewCount: number;      // 현재는 알 수 없으니 0 (필요하면 추후 서버에서 계산)
};
