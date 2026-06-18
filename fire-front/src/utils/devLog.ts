/** 개발 모드에서만 console.log 출력 (프로덕션 성능·노이즈 방지) */
export function devLog(...args: unknown[]): void {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
}
