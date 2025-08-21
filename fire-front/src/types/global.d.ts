// 차량 기본 타입
export type Vehicle = {
    id: string;
    sido: string;          // 시도
    station: string;       // 소방서
    type: string;          // 차종
    callname: string;      // 호출명
    capacity: string;      // 용량
    personnel: string;     // 인원
    avl: string;           // AVL 단말기 번호
    pslte: string;         // PS-LTE 번호
    status?: "활동" | "대기" | "철수"; // 상태
    rally?: boolean;       // 자원집결지 여부
};

// 엑셀 업로드용 행 타입
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
    구분: string;          // 예: "경북 전체", "서울 대기"
    "차량(계)": number;     // 차량 총계
    "인원(계)": number;     // 인원 총계
} & Record<VehicleTypeKey, number>;

// ==============================
// 📌 전체 상수 (집계용)
// ==============================
export const COL_ORDER: VehicleTypeKey[] = [
    "경펌", "소펌", "중펌", "대펌",
    "중형탱크", "대형탱크", "급수탱크",
    "화학", "산불", "험지", "로젠바우어", "산불신속팀",
    "구조", "구급", "지휘", "조사", "굴절", "고가", "배연", "회복", "지원", "기타",
];