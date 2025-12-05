/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/tmapParser.ts

export function parseTmapRoute(response: any) {
    const features = response.features;
    if (!features) throw new Error("TMAP features 없음");

    const coords: any[] = [];
    const instructions: { text: string; type: number }[] = [];

    features.forEach((f: any) => {
        if (f.geometry.coordinates.length > 1) {
            f.geometry.coordinates.forEach(([lon, lat]: number[]) => {
                coords.push(new window.kakao.maps.LatLng(lat, lon));
            });
        }

        if (f.properties.turnType !== undefined) {
            const msg = convertTurnType(f.properties.turnType, f.properties.description);
            instructions.push({ text: msg, type: f.properties.turnType });
        }
    });

    return { coords, instructions };
}

function convertTurnType(type: number, desc: string) {
    const map: Record<number, string> = {
        11: "좌회전하세요.",
        12: "우회전하세요.",
        13: "유턴하세요.",
        16: "직진하세요.",
    };

    return map[type] ? map[type] : desc;
}
