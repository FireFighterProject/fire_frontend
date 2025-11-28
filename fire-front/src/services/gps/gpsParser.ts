// src/services/gps/gpsParser.ts

export interface ParsedGPS {
    lat: number;
    lon: number;
    speed?: number;
    time?: string;
    valid: boolean;
}

function convertDMSToDecimal(value: string, direction: string): number {
    // NMEA 형식 예: 3530.1234 → 35도 30.1234분
    const deg = parseInt(value.slice(0, value.indexOf('.') - 2), 10);
    const min = parseFloat(value.slice(value.indexOf('.') - 2));

    let decimal = deg + min / 60;
    if (direction === "S" || direction === "W") decimal *= -1;
    return decimal;
}

export function parseNMEA(line: string): ParsedGPS | null {
    const parts = line.split(",");

    // GPRMC 문장
    if (line.startsWith("$GPRMC")) {
        const valid = parts[2] === "A"; // A = valid

        const lat = convertDMSToDecimal(parts[3], parts[4]);
        const lon = convertDMSToDecimal(parts[5], parts[6]);
        const speed = parseFloat(parts[7]); // knot 단위
        const time = parts[1];

        return {
            lat,
            lon,
            speed,
            time,
            valid,
        };
    }

    // GPGGA 문장
    if (line.startsWith("$GPGGA")) {
        const lat = convertDMSToDecimal(parts[2], parts[3]);
        const lon = convertDMSToDecimal(parts[4], parts[5]);
        const valid = parts[6] !== "0";

        return {
            lat,
            lon,
            valid,
        };
    }

    return null;
}
