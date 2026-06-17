/* eslint-disable @typescript-eslint/no-explicit-any */
/* 숫자 변환 */
export const toNum = (v: any): number | "" => {
    if (v === null || v === undefined) return "";
    if (typeof v === "number") return isNaN(v) ? "" : v;

    const raw = String(v).trim();
    if (raw === "") return "";

    const digits = raw.replace(/[^\d]/g, "");
    return digits === "" ? "" : Number(digits);
};

/* 시도 매핑 */
export const SIDO_OPTIONS = [
    "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
    "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원도",
    "충청북도", "충청남도", "전라북도", "전라남도", "경상북도",
    "경상남도", "제주특별자치도"
];

const SIDO_MAP: Record<string, string> = {
    "서울": "서울특별시",
    "부산": "부산광역시",
    "대구": "대구광역시",
    "인천": "인천광역시",
    "광주": "광주광역시",
    "대전": "대전광역시",
    "울산": "울산광역시",
    "세종": "세종특별자치시",
    "경기": "경기도",
    "강원": "강원도",
    "충북": "충청북도",
    "충남": "충청남도",
    "전북": "전라북도",
    "전남": "전라남도",
    "경북": "경상북도",
    "경남": "경상남도",
    "제주": "제주특별자치도"
};

export const toFullSido = (raw: string = "") => {
    const cleaned = raw.replace(/\s+/g, "");
    if (SIDO_OPTIONS.includes(cleaned)) return cleaned;
    return SIDO_MAP[cleaned] ?? cleaned;
};

/** 백엔드 batch API용 시도 약칭 (예: 경상북도 → 경북) */
const FULL_TO_BATCH_SIDO: Record<string, string> = {
    "서울특별시": "서울",
    "부산광역시": "부산",
    "대구광역시": "대구",
    "인천광역시": "인천",
    "광주광역시": "광주",
    "대전광역시": "대전",
    "울산광역시": "울산",
    "세종특별자치시": "세종",
    "경기도": "경기",
    "강원도": "강원",
    "충청북도": "충북",
    "충청남도": "충남",
    "전라북도": "전북",
    "전라남도": "전남",
    "경상북도": "경북",
    "경상남도": "경남",
    "제주특별자치도": "제주",
};

export const toBatchSido = (sido: string): string => {
    const full = toFullSido(sido);
    return FULL_TO_BATCH_SIDO[full] ?? full.replace(/특별시|광역시|특별자치시|도/g, "");
};

/* 소방서 이름 정규화 */
export const normalizeStationName = (name: string | undefined) => {
    if (!name) return "";
    return name.endsWith("소방서") ? name : `${name}소방서`;
};

/* 전화번호 정규화 */
export const normalizePhone = (value: string | number | undefined | null): string => {
    if (value == null) return "";
    return String(value).replace(/\D/g, "").slice(0, 11);
};

/* 전화번호 표시 포맷 */
export const formatPhone = (value: string | number | undefined | null): string => {
    const digits = normalizePhone(value);
    if (!digits) return "";
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

/* 소방서명으로 시도 조회 */
export const resolveSidoFromStation = (
    stationName: string,
    allStations: { name: string; sido: string }[]
): string => {
    const normalized = normalizeStationName(stationName);
    const found = allStations.find(
        (s) => s.name === normalized || s.name === stationName
    );
    return found?.sido ?? "";
};
