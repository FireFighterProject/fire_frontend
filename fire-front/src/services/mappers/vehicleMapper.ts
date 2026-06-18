import type { ApiFireStation, ApiVehicleListItem } from "../../api/types";
import type { Vehicle } from "../../types/global";
import {
    statusCodeToLabel,
    statusLabelToCode,
    VEHICLE_STATUS_CODE,
} from "../vehicle/status";

export { statusCodeToLabel, statusLabelToCode, VEHICLE_STATUS_CODE };
export const BACKEND_STATUS_LABELS = {
    0: "대기",
    1: "활동",
    2: "복귀중",
    3: "집결중",
} as const;

export const STATUS_TO_CODE: Record<string, number> = {
    대기: VEHICLE_STATUS_CODE.대기,
    활동: VEHICLE_STATUS_CODE.활동,
    출동중: VEHICLE_STATUS_CODE.활동,
    복귀중: VEHICLE_STATUS_CODE.복귀중,
    복귀: VEHICLE_STATUS_CODE.복귀중,
    철수: VEHICLE_STATUS_CODE.복귀중,
    집결중: VEHICLE_STATUS_CODE.집결중,
};

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
