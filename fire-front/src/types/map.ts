        // src/types/map.ts
export interface MapVehicle {
    id: number;

    // 호출부호 / 표기명
    callname: string;
    callSign?: string;
    name?: string;

    // 행정구역 정보
    sido: string;
    station: string;
    stationName?: string;

    // 차량 종류
    type: string;
    typeName?: string;

    personnel: number;
    dispatchPlace?: string;

    // GPS
    lat: number;
    lng: number;

    heading?: number;
    speedKph?: number;

    // 상태
    status: "대기" | "활동" | "철수" | "기타";
}

// 기존 Vehicle 타입이 필요하면 아래처럼 alias
export type Vehicle = MapVehicle;

export type Filters = { sido: string; station: string; type: string };

export type MarkerBundle = {
    marker: kakao.maps.Marker;             // ✅ any 제거
    info: kakao.maps.InfoWindow | null;    // ✅ any 제거
    data: MapVehicle;
};

export type MapStats = {
    visibleCount: number;
    selectedAreaCount: number;
    dragAreaCount: number;
    totalCount: number;
};

