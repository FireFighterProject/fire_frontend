import type { ApiFireStation, ApiVehicleListItem } from "../../api/types";
import type { Vehicle } from "../../types/global";
/** 백엔드 status 코드 → 프런트 표시 라벨 (0=대기, 1=활동, 2=철수, 3=집결중) */
export const BACKEND_STATUS_LABELS: Record<number, string> = {
    0: "대기",
    1: "활동",
    2: "철수",
    3: "집결중",
};

export const STATUS_TO_CODE: Record<string, number> = {
    대기: 0,
    활동: 1,
    출동중: 1,
    철수: 2,
    집결중: 3,
};

export function statusCodeToLabel(code: number): string {
    return BACKEND_STATUS_LABELS[code] ?? "대기";
}

export function mapApiToVehicle(
    v: ApiVehicleListItem,
    options?: { stationName?: string; station?: { sido?: string; name?: string } }
): Vehicle {
    const station = options?.station;
    const stationName = options?.stationName ?? station?.name ?? "";

    const contact = (v.psLteNumber || v.avlNumber || "").replace(/\D/g, "").slice(0, 11);

    return {
        id: String(v.id),
        stationId: v.stationId,
        sido: v.sido ?? station?.sido ?? "",
        station: stationName,
        type: v.typeName ?? "",
        callname: v.callSign ?? "",
        personnel: v.personnel ?? "0",
        contact,
        status: statusCodeToLabel(v.status),
        rally: v.rallyPoint === 1,
        dispatchPlace: "",
        content: "",
    };
}

export function mapApiListToVehicles(
    list: ApiVehicleListItem[],
    stationMap?:
        | Map<number, string>
        | Map<number, ApiFireStation>
        | Record<number, { sido?: string; name?: string } | ApiFireStation>
): Vehicle[] {
    return list.map((v) => {
        if (stationMap instanceof Map) {
            const val = stationMap.get(v.stationId);
            if (typeof val === "string") {
                return mapApiToVehicle(v, { stationName: val });
            }
            if (val && typeof val === "object") {
                return mapApiToVehicle(v, { station: val });
            }
        } else if (stationMap) {
            const station = stationMap[v.stationId];
            return mapApiToVehicle(v, { station });
        }
        return mapApiToVehicle(v);
    });
}
