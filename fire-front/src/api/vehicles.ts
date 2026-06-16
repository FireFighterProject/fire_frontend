import api from "./axios";
import type { ApiVehicleListItem, FetchVehiclesParams } from "./types";
import { mapApiListToVehicles } from "../services/mappers/vehicleMapper";
import type { Vehicle } from "../types/global";

export async function fetchVehicleList(
    params?: FetchVehiclesParams
): Promise<ApiVehicleListItem[]> {
    const query: Record<string, string | number> = {};
    if (params?.stationId) query.stationId = params.stationId;
    if (params?.status) query.status = params.status;
    if (params?.typeName) query.typeName = params.typeName;
    if (params?.callSignLike) query.callSign = params.callSignLike;

    const res = await api.get<ApiVehicleListItem[]>("/vehicles", { params: query });
    return res.data ?? [];
}

export async function fetchVehiclesMapped(
    params?: FetchVehiclesParams,
    stationMap?: Map<number, string>
): Promise<Vehicle[]> {
    const list = await fetchVehicleList(params);
    return mapApiListToVehicles(list, stationMap);
}

export const deleteVehicle = (id: number | string) =>
    api.delete(`/vehicles/${id}`);

export const deleteVehicles = (vehicleIds: number[]) =>
    api.delete("/vehicles", { data: { vehicleIds } });

export const patchVehicleStatus = (id: number | string, status: number) =>
    api.patch(`/vehicles/${id}/status`, { status });
