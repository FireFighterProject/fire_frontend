

// 엑셀 업로드 1행 구조
export type ExcelRow = {
    시도: string;
    소방서: string;
    차종: string;
    호출명: string;
    용량: string;             // Excel은 항상 문자열
    인원: string;
    "AVL 단말기번호"?: string;
    "PS-LTE 번호"?: string;
};

// ExcelRow → Vehicle 변환 함수
export function toVehicle(row: ExcelRow, id: string): Vehicle {
    return {
        id,
        sido: row.시도,
        station: row.소방서,
        type: row.차종,
        callname: row.호출명,
        capacity: Number(row.용량) || 0,
        personnel: Number(row.인원) || 0,
        avl: row["AVL 단말기번호"] ?? "",
        pslte: row["PS-LTE 번호"] ?? "",
        status: "대기",   // 업로드 시 기본값
        rally: false,
    };
}


// ==============================
// 📊 현황 페이지 집계용 타입 추가
// ==============================
// 집계 컬럼 키 (차량 종류)
export type VehicleTypeKey =
    | "경펌" | "소펌" | "중펌" | "대펌"
    | "중형탱크" | "대형탱크" | "급수탱크"
    | "화학" | "산불" | "험지"
    | "로젠바우어" | "산불신속팀"
    | "구조" | "구급"
    | "지휘" | "조사"
    | "굴절" | "고가" | "배연"
    | "회복" | "지원" | "기타";

// 표 한 행(Row) 타입
export type StatusRow = {
    구분: string;        // 예: "경북 전체", "서울 대기"
    "차량(계)": number;   // 차량 총계
    "인원(계)": number;   // 인원 총계
} & Record<VehicleTypeKey, number>;

// 집계용 컬럼 순서
export const COL_ORDER: VehicleTypeKey[] = [
    "경펌", "소펌", "중펌", "대펌",
    "중형탱크", "대형탱크", "급수탱크",
    "화학", "산불", "험지", "로젠바우어", "산불신속팀",
    "구조", "구급", "지휘", "조사",
    "굴절", "고가", "배연", "회복", "지원", "기타",
];

// src/types/global.ts

// 차량 상태 (업무 흐름상 다양하게 필요)
// src/types/global.ts
export type VehicleStatus =
    | "대기"
    | "활동"
    | "대기중"
    | "출동중"
    | "복귀"
    | "철수";

// src/types/global.ts
export interface Vehicle {
    id: string;
    sido: string;
    station: string;
    type: string;
    callname: string;
    capacity: number;
    personnel: number;
    avl: string;
    pslte: string;
    status: VehicleStatus;
    lat?: number | null;
    lng?: number | null;
    dispatchPlace?: string | null;  // ✅ 출동지 주소
    contact?: string | null;        // ✅ 현장 연락처
    content?: string | null;        // ✅ 지시사항/특이사항
    rally: boolean;
}


