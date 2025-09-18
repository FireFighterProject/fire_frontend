export interface Vehicle {
    id: string;
    callname: string;
    sido: string;
    station: string;
    type: string;
    personnel: number;
    dispatchPlace: string;
    lat: number;
    lng: number;
    status: "출동중" | "대기";
}

export type Filters = { sido: string; station: string; type: string };

export type MarkerBundle = {
    marker: kakao.maps.Marker;             // ✅ any 제거
    info: kakao.maps.InfoWindow | null;    // ✅ any 제거
    data: Vehicle;
};

export type MapStats = {
    visibleCount: number;
    selectedAreaCount: number;
    totalCount: number;
};
