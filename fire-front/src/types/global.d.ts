// ==============================
// 1) 엑셀 1행 타입 (동일 유지)
// ==============================
export type ExcelRow = {
    시도: string;
    소방서: string;       // ⚠️ 백엔드는 stationId(숫자) 필요 → 이름→ID 매핑 필요
    차종: string;         // → typeName
    호출명: string;       // → callSign
    용량: string;         // Excel은 항상 문자열
    인원: string;
    "AVL 단말기번호"?: string;
    "PS-LTE 번호"?: string;
};

// ==============================
// 2) 프런트 내부 상태/표현용 타입 (유지)
//    - 기존 VehicleStatus/Vehicle를 유지하고,
//      백엔드와의 변환 유틸만 교체합니다.
// ==============================
export type VehicleStatus =
    | "대기"
    | "활동"
    | "대기중"
    | "출동중"
    | "복귀"
    | "철수";

export interface Vehicle {
    id: string;                 // 프런트에서 사용하는 로컬 ID
    sido: string;
    station: string;
    stationId: number;  // 이름(표시용). 백엔드는 stationId로 통신
    type: string;               // = typeName
    callname: string;           // = callSign
    capacity: string;
    personnel: string;
    avl: string;                // = avlNumber
    pslte: string;              // = psLteNumber
    status: VehicleStatus;      // 프런트는 문자열 상태 유지
    lat?: number | null;
    lng?: number | null;
    dispatchPlace?: string | null;
    contact?: string | null;
    content?: string | null;
    rally: boolean;             // 프런트는 boolean, 백엔드는 number(rallyPoint)
}

// ==============================
// 3) 백엔드 API 페이로드 타입
// ==============================
export type ApiVehicle = {
    stationId: number;
    callSign: string;
    typeName: string;
    capacity: number;
    personnel: number;
    avlNumber: string;
    psLteNumber: string;
    status: number;     // 코드값
    rallyPoint: number; // 0/1 (또는 지정 번호)
};

// ==============================
// 4) 상태코드 매핑 (가정)
//    - 백엔드 status: number <-> 프런트 VehicleStatus 매핑
//    - 필요시 숫자값은 백엔드 정의에 맞춰 조정하세요.
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

// ==============================
// 5) 소방서 이름 → ID 매핑 (가설 표)
//    - 실제 운영 데이터로 교체하세요.
// ==============================
const STATION_NAME_TO_ID: Record<string, number> = {
    "포항소방서": 1,
    "구미소방서": 2,
    // ...
};

// 역매핑(표시용): 필요 시 사용
const STATION_ID_TO_NAME: Record<number, string> = Object.fromEntries(
    Object.entries(STATION_NAME_TO_ID).map(([name, id]) => [id, name])
);

// ==============================
// 6) 공통 유틸
// ==============================
const toNum = (v: string | number | undefined | null, fallback = 0) => {
    const n = typeof v === "string" ? Number(v.replaceAll(",", "")) : Number(v);
    return Number.isFinite(n) ? n : fallback;
};

// ==============================
// 7) 엑셀(Row) → 프런트 Vehicle
//    (프런트 상태에 올릴 때 사용)
// ==============================
export function toFrontVehicleFromExcel(row: ExcelRow, id: string): Vehicle {
    return {
        id,
        sido: row.시도,
        station: row.소방서,              // 화면 표시용 이름
        type: row.차종,
        callname: row.호출명,
        capacity: toNum(row.용량, 0),
        personnel: toNum(row.인원, 0),
        avl: row["AVL 단말기번호"] ?? "",
        pslte: row["PS-LTE 번호"] ?? "",
        status: "대기",                   // 업로드 기본값
        lat: null,
        lng: null,
        dispatchPlace: null,
        contact: null,
        content: null,
        rally: false,
    };
}

// ==============================
// 8) 엑셀(Row) → 백엔드 ApiVehicle
//    (서버로 바로 보낼 때 사용)
// ==============================
export function toApiVehicleFromExcel(row: ExcelRow): ApiVehicle {
    const stationId =
        STATION_NAME_TO_ID[row.소방서] ??
        0; // ⚠️ 미매핑 시 0 → 서버 검증/에러 핸들링 권장

    return {
        stationId,
        callSign: row.호출명 ?? "",
        typeName: row.차종 ?? "",
        capacity: toNum(row.용량, 0),
        personnel: toNum(row.인원, 0),
        avlNumber: row["AVL 단말기번호"] ?? "",
        psLteNumber: row["PS-LTE 번호"] ?? "",
        status: STATUS_CODE["대기"], // 기본: 대기
        rallyPoint: 0,              // 기본 0 (필요시 규칙 지정)
    };
}

// ==============================
// 9) 프런트 Vehicle → 백엔드 ApiVehicle
//    (수정 저장 등 서버 전송 시 사용)
// ==============================
export function toApiVehicleFromFront(v: Vehicle): ApiVehicle {
    const stationId =
        STATION_NAME_TO_ID[v.station] ??
        0; // 이름만 들고 있으면 매핑 필요 (혹은 Vehicle에 stationId도 보관)

    return {
        stationId,
        callSign: v.callname,
        typeName: v.type,
        capacity: toNum(v.capacity, 0),
        personnel: toNum(v.personnel, 0),
        avlNumber: v.avl ?? "",
        psLteNumber: v.pslte ?? "",
        status: STATUS_CODE[v.status],
        rallyPoint: v.rally ? 1 : 0, // boolean → number
    };
}

// ==============================
// 10) 백엔드 ApiVehicle → 프런트 Vehicle
//     (서버 조회 결과를 화면 상태로)
// ==============================
export function toFrontVehicleFromApi(api: ApiVehicle, id: string, sido = "", lat: number | null = null, lng: number | null = null): Vehicle {
    const stationName = STATION_ID_TO_NAME[api.stationId] ?? String(api.stationId);

    return {
        id,
        sido, // 필요 시 별도 필드에서 받아 주입
        station: stationName,
        type: api.typeName,
        callname: api.callSign,
        capacity: api.capacity,
        personnel: api.personnel,
        avl: api.avlNumber,
        pslte: api.psLteNumber,
        status: CODE_STATUS[api.status] ?? "대기",
        lat,
        lng,
        dispatchPlace: null,
        contact: null,
        content: null,
        rally: !!api.rallyPoint,
    };
}

// ==============================
// 11) (선택) 집계 타입/컬럼: 기존 유지 가능
//     - 백엔드 스키마와 직접 충돌 없음
// ==============================
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
