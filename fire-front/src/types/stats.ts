// src/types/stats.ts

export type StatLog = {
    id: number;
    vehicleId: number;
    date: string;           // YYYY-MM-DD 같은 문자열
    dispatchTime: string;   // 출동 시각
    returnTime: string;     // 복귀 시각
    dispatchPlace: string;  // 출동 장소
    moved: boolean;         // 장소 이동 여부
    minutes: number;        // 활동 시간(분)
    command: string;        // 명령/출동 사유
    crewCount: number;      // 참여 인원 수
};
