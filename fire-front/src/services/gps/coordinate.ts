// src/services/gps/coordinate.ts

/** Degree-Minute-Second → Decimal 변환 */
export function dmsToDecimal(d: number, m: number, s: number, direction: "N" | "S" | "E" | "W"): number {
    let decimal = d + m / 60 + s / 3600;
    if (direction === "S" || direction === "W") decimal *= -1;
    return decimal;
}

/** radian 변환 */
export const toRad = (value: number): number => (value * Math.PI) / 180;

/** 두 GPS 좌표 거리 (미터) */
export function distanceMeter(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
