// ==============================
// 1) 엑셀 1행 타입
// ==============================
export type ExcelRow = {
    시도: string;
    소방서: string;
    차종: string;
    호출명: string;
    용량: string;
    인원: string;
    "AVL 단말기번호"?: string;
    "PS-LTE 번호"?: string;
};

// ==============================
// 2) 프런트 Vehicle 타입(중앙 통합 타입)
// ==============================
export type VehicleStatus =
    | "대기"
    | "활동"
    | "대기중"
    | "출동중"
    | "복귀"
    | "철수";

export interface Vehicle {
    id: string | number;

    // 행정구역
    sido: string;
    station: string;        // 표시용
    stationId: number;      // 백엔드용
    stationName?: string;   // 호환용

    // 차량 정보
    type: string;
    callname: string;
    typeName?: string;
    callSign?: string;
    name?: string;

    // 용량/인원
    capacity: number | string;
    personnel: number | string;

    // 단말기
    avl: string;
    pslte: string;

    // 상태
    status: VehicleStatus;

    // GPS
    lat?: number | null;
    lng?: number | null;

    // 출동 관련
    dispatchPlace?: string | null;
    contact?: string | null;
    content?: string | null;

    // 집결 여부
    rally: boolean;
    rallyPoint?: number;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

// ==============================
// 3) 백엔드 API 타입
// ==============================
export type ApiVehicle = {
    stationId: number;
    callSign: string;
    typeName: string;
    capacity: number;
    personnel: number;
    avlNumber: string;
    psLteNumber: string;
    status: number;
    rallyPoint: number;
};

// ==============================
// 4) 상태 코드 매핑
// ==============================
export const STATUS_CODE: Record<VehicleStatus, number> = {
    대기: 0,
    활동: 1,
    대기중: 2,
    출동중: 3,
    복귀: 4,
    철수: 5,
};

export const CODE_STATUS: Record<number, VehicleStatus> = {
    0: "대기",
    1: "활동",
    2: "대기중",
    3: "출동중",
    4: "복귀",
    5: "철수",
};

// ==============================
// 5) 소방서 매핑 (실데이터에 맞춰 교체 가능)
// ==============================
const STATION_NAME_TO_ID: Record<string, number> = {
    "포항소방서": 1,
    "구미소방서": 2,
};

const STATION_ID_TO_NAME: Record<number, string> =
    Object.fromEntries(
        Object.entries(STATION_NAME_TO_ID).map(([n, id]) => [id, n])
    );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toNum = (v: any, fb = 0) => {
    const n = Number(String(v).replaceAll(",", ""));
    return Number.isFinite(n) ? n : fb;
};

// ==============================
// 7) Excel → Vehicle
// ==============================
export function toFrontVehicleFromExcel(row: ExcelRow, id: string): Vehicle {
    return {
        id,
        sido: row.시도,
        station: row.소방서,
        stationId: STATION_NAME_TO_ID[row.소방서] ?? 0,
        type: row.차종,
        callname: row.호출명,
        capacity: toNum(row.용량),
        personnel: toNum(row.인원),
        avl: row["AVL 단말기번호"] ?? "",
        pslte: row["PS-LTE 번호"] ?? "",
        status: "대기",
        lat: null,
        lng: null,
        rally: false,
    };
}

// ==============================
// 8) Excel → ApiVehicle
// ==============================
export function toApiVehicleFromExcel(row: ExcelRow): ApiVehicle {
    return {
        stationId: STATION_NAME_TO_ID[row.소방서] ?? 0,
        callSign: row.호출명,
        typeName: row.차종,
        capacity: toNum(row.용량),
        personnel: toNum(row.인원),
        avlNumber: row["AVL 단말기번호"] ?? "",
        psLteNumber: row["PS-LTE 번호"] ?? "",
        status: STATUS_CODE["대기"],
        rallyPoint: 0,
    };
}

// ==============================
// 9) Vehicle → ApiVehicle
// ==============================
export function toApiVehicleFromFront(v: Vehicle): ApiVehicle {
    return {
        stationId: v.stationId,
        callSign: v.callname,
        typeName: v.type,
        capacity: toNum(v.capacity),
        personnel: toNum(v.personnel),
        avlNumber: v.avl ?? "",
        psLteNumber: v.pslte ?? "",
        status: STATUS_CODE[v.status],
        rallyPoint: v.rally ? 1 : 0,
    };
}

// ==============================
// 10) ApiVehicle → Vehicle
// ==============================
export function toFrontVehicleFromApi(
    api: ApiVehicle,
    id: string,
    sido = "",
    lat: number | null = null,
    lng: number | null = null
): Vehicle {
    return {
        id,
        sido,
        station: STATION_ID_TO_NAME[api.stationId] ?? "",
        stationId: api.stationId,
        type: api.typeName,
        callname: api.callSign,
        capacity: api.capacity,
        personnel: api.personnel,
        avl: api.avlNumber,
        pslte: api.psLteNumber,
        status: CODE_STATUS[api.status] ?? "대기",
        lat,
        lng,
        rally: !!api.rallyPoint,
    };
}
// src/types/vehicle.ts

export interface Vehicle {
    id: number | string;

    stationId: number;
    sido: string;
    station: string;

    type: string;
    callname: string;

    capacity: number | string;
    personnel: number | string;

    avl: string;
    pslte: string;

    status: VehicleStatus;
    rally: boolean;
}
