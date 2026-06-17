// ==============================
// 1) 엑셀 1행 타입 (클라이언트 양식)
// ==============================
export type ExcelRow = {
    연번?: string | number;
    소방서: string;
    호출명: string;
    차종: string;
    인원: string | number;
    연락처: string;
};

// ==============================
// 2) 프런트 Vehicle 타입
// ==============================
export type VehicleStatus =
    | "대기"
    | "활동"
    | "대기중"
    | "출동중"
    | "복귀"
    | "철수"
    | "집결중";

export interface Vehicle {
    id: string | number;

    sido: string;
    station: string;
    stationId: number;
    stationName?: string;

    type: string;
    callname: string;
    typeName?: string;
    callSign?: string;
    name?: string;

    personnel: number | string;
    contact: string;

    status: VehicleStatus;

    lat?: number | null;
    lng?: number | null;

    dispatchPlace?: string | null;
    content?: string | null;

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
    personnel: number;
    psLteNumber: string;
    status: number;
    rallyPoint: number;
    capacity?: number | null;
    avlNumber?: string;
};

// ==============================
// 4) 상태 코드 매핑
// ==============================
export const STATUS_CODE: Record<VehicleStatus, number> = {
    대기: 0,
    활동: 1,
    대기중: 2,
    출동중: 1,
    복귀: 4,
    철수: 2,
    집결중: 3,
};

export const CODE_STATUS: Record<number, VehicleStatus> = {
    0: "대기",
    1: "활동",
    2: "대기중",
    3: "집결중",
    4: "복귀",
    5: "철수",
};

const STATION_NAME_TO_ID: Record<string, number> = {
    "포항소방서": 1,
    "구미소방서": 2,
};

const STATION_ID_TO_NAME: Record<number, string> = Object.fromEntries(
    Object.entries(STATION_NAME_TO_ID).map(([n, id]) => [id, n])
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toNum = (v: any, fb = 0) => {
    const n = Number(String(v).replaceAll(",", ""));
    return Number.isFinite(n) ? n : fb;
};

const normalizePhone = (v: string | number | undefined | null): string => {
    if (v == null) return "";
    return String(v).replace(/\D/g, "").slice(0, 11);
};

// ==============================
// 5) Excel → Vehicle
// ==============================
export function toFrontVehicleFromExcel(row: ExcelRow, id: string): Vehicle {
    return {
        id,
        sido: "",
        station: row.소방서,
        stationId: STATION_NAME_TO_ID[row.소방서] ?? 0,
        type: row.차종,
        callname: row.호출명,
        personnel: toNum(row.인원),
        contact: normalizePhone(row.연락처),
        status: "대기",
        lat: null,
        lng: null,
        rally: false,
    };
}

// ==============================
// 6) Excel → ApiVehicle
// ==============================
export function toApiVehicleFromExcel(row: ExcelRow): ApiVehicle {
    return {
        stationId: STATION_NAME_TO_ID[row.소방서] ?? 0,
        callSign: row.호출명,
        typeName: row.차종,
        personnel: toNum(row.인원),
        psLteNumber: normalizePhone(row.연락처),
        status: STATUS_CODE["대기"],
        rallyPoint: 0,
    };
}

// ==============================
// 7) Vehicle → ApiVehicle
// ==============================
export function toApiVehicleFromFront(v: Vehicle): ApiVehicle {
    return {
        stationId: v.stationId,
        callSign: v.callname,
        typeName: v.type,
        personnel: toNum(v.personnel),
        psLteNumber: normalizePhone(v.contact),
        status: STATUS_CODE[v.status],
        rallyPoint: v.rally ? 1 : 0,
    };
}

// ==============================
// 8) ApiVehicle → Vehicle
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
        personnel: api.personnel,
        contact: normalizePhone(api.psLteNumber || api.avlNumber),
        status: CODE_STATUS[api.status] ?? "대기",
        lat,
        lng,
        rally: !!api.rallyPoint,
    };
}
