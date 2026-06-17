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
// 2) 프런트 내부 상태/표현용 타입
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
    callSign?: string;
    name?: string;

    personnel: string | number;
    contact: string;

    status: string;

    lat?: number | null;
    lng?: number | null;

    dispatchPlace?: string | null;
    content?: string | null;

    rally: boolean;
    rallyPoint?: number;

    [key: string]: unknown;
}

// ==============================
// 3) 백엔드 API 페이로드 타입
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
// 4) 상태코드 매핑
// ==============================
export const STATUS_CODE: Record<VehicleStatus, number> = {
    "대기": 0,
    "활동": 1,
    "대기중": 2,
    "출동중": 3,
    "복귀": 4,
    "철수": 5,
};

export const CODE_STATUS: Record<number, VehicleStatus> = {
    0: "대기",
    1: "활동",
    2: "대기중",
    3: "출동중",
    4: "복귀",
    5: "철수",
};

const STATION_NAME_TO_ID: Record<string, number> = {
    "포항소방서": 1,
    "구미소방서": 2,
};

const STATION_ID_TO_NAME: Record<number, string> = Object.fromEntries(
    Object.entries(STATION_NAME_TO_ID).map(([name, id]) => [id, name])
);

const toNum = (v: string | number | undefined | null, fallback = 0) => {
    const n = typeof v === "string" ? Number(v.replaceAll(",", "")) : Number(v);
    return Number.isFinite(n) ? n : fallback;
};

const normalizePhone = (v: string | number | undefined | null): string => {
    if (v == null) return "";
    return String(v).replace(/\D/g, "").slice(0, 11);
};

export function toFrontVehicleFromExcel(row: ExcelRow, id: string): Vehicle {
    return {
        id,
        sido: "",
        station: row.소방서,
        stationId: STATION_NAME_TO_ID[row.소방서] ?? 0,
        type: row.차종,
        callname: row.호출명,
        personnel: toNum(row.인원, 0),
        contact: normalizePhone(row.연락처),
        status: "대기",
        lat: null,
        lng: null,
        dispatchPlace: null,
        content: null,
        rally: false,
    };
}

export function toApiVehicleFromExcel(row: ExcelRow): ApiVehicle {
    const stationId = STATION_NAME_TO_ID[row.소방서] ?? 0;

    return {
        stationId,
        callSign: row.호출명 ?? "",
        typeName: row.차종 ?? "",
        personnel: toNum(row.인원, 0),
        psLteNumber: normalizePhone(row.연락처),
        status: STATUS_CODE["대기"],
        rallyPoint: 0,
    };
}

export function toApiVehicleFromFront(v: Vehicle): ApiVehicle {
    const stationId = STATION_NAME_TO_ID[v.station] ?? v.stationId ?? 0;

    return {
        stationId,
        callSign: v.callname,
        typeName: v.type,
        personnel: toNum(v.personnel, 0),
        psLteNumber: normalizePhone(v.contact),
        status: STATUS_CODE[v.status as VehicleStatus] ?? 0,
        rallyPoint: v.rally ? 1 : 0,
    };
}

export function toFrontVehicleFromApi(
    api: ApiVehicle,
    id: string,
    sido = "",
    lat: number | null = null,
    lng: number | null = null
): Vehicle {
    const stationName = STATION_ID_TO_NAME[api.stationId] ?? String(api.stationId);

    return {
        id,
        sido,
        station: stationName,
        stationId: api.stationId,
        type: api.typeName,
        callname: api.callSign,
        personnel: api.personnel,
        contact: normalizePhone(api.psLteNumber || api.avlNumber),
        status: CODE_STATUS[api.status] ?? "대기",
        lat,
        lng,
        dispatchPlace: null,
        content: null,
        rally: !!api.rallyPoint,
    };
}

export type VehicleTypeKey =
    | "경펌" | "소펌" | "중펌" | "대펌"
    | "중형탱크" | "대형탱크" | "급수탱크"
    | "화학" | "산불" | "험지"
    | "로젠바우어" | "산불신속팀"
    | "구조" | "구급"
    | "지휘" | "조사"
    | "굴절" | "고가" | "배연"
    | "회복" | "지원" | "기타";

export type StatusRow = {
    구분: string;
    "차량(계)": number;
    "인원(계)": number;
} & Record<VehicleTypeKey, number>;

export const COL_ORDER: VehicleTypeKey[] = [
    "경펌", "소펌", "중펌", "대펌",
    "중형탱크", "대형탱크", "급수탱크",
    "화학", "산불", "험지", "로젠바우어", "산불신속팀",
    "구조", "구급", "지휘", "조사",
    "굴절", "고가", "배연", "회복", "지원", "기타",
];
