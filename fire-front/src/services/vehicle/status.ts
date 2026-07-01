/** 백엔드 status 코드 (OpenAPI 기준) */
export const VEHICLE_STATUS_CODE = {
    대기: 0,
    활동: 1,
    복귀중: 2,
    집결중: 3,
} as const;

/** 화면 표시 라벨 — 코드 2는 UI에서 '복귀중' (백엔드 명칭: 철수) */
export const VEHICLE_STATUS_LABEL: Record<number, string> = {
    0: "대기",
    1: "활동",
    2: "복귀중",
    3: "집결중",
};

export function statusCodeToLabel(code: number): string {
    return VEHICLE_STATUS_LABEL[code] ?? "대기";
}

export function statusLabelToCode(label: string): number {
    if (label === "대기") return 0;
    if (label === "활동" || label === "출동중") return 1;
    if (label === "복귀중" || label === "복귀" || label === "철수") return 2;
    if (label === "집결중") return 3;
    return 0;
}

/** 자원배분(출동 편성) 가능 상태 */
export function isDispatchableStatus(status?: string): boolean {
    return status === "대기" || status === "복귀중";
}

export function isActiveStatus(status?: string): boolean {
    const s = status ?? "";
    return s.includes("활동") || s.includes("출동") || s.includes("임무");
}

/** 복귀 이동 중 (코드 2, 철수/복귀 별칭 포함) */
export function isReturningStatus(status?: string): boolean {
    return statusLabelToCode(String(status ?? "")) === VEHICLE_STATUS_CODE.복귀중;
}

/** 자원관리(/activity) 목록 표시 대상 — 활동 + 복귀중 */
export function isActivityManageVisibleStatus(status?: string): boolean {
    return isActiveStatus(status) || isReturningStatus(status);
}

/** 지도·GPS 추적 대상 (출동 중 + 복귀 이동 중) */
export function isMapTrackableStatus(status?: string): boolean {
    if (!status) return false;
    return isActivityManageVisibleStatus(status);
}

export function matchesStatusFilter(
    vehicleStatus: string | undefined,
    filterCode: string | number
): boolean {
    if (filterCode === "" || filterCode === null || filterCode === undefined) {
        return true;
    }
    return statusLabelToCode(String(vehicleStatus ?? "")) === Number(filterCode);
}

/** 관리 화면에서 대기(0)로 되돌릴 수 있는지 */
export function canResetToStandby(status?: string): boolean {
    return statusLabelToCode(String(status ?? "")) !== VEHICLE_STATUS_CODE.대기;
}
