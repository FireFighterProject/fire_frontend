import api from "./axios";
import type { LatestDispatchResponse } from "./types";

export const createDispatchOrder = (payload: {
    stationId: number;
    title: string;
    description: string;
}) => api.post("/dispatch-orders", payload);

export const getDispatchOrders = (status?: number) =>
    api.get("/dispatch-orders", { params: { status } });

export const assignVehicle = (id: number, vehicleId: number) =>
    api.post(`/dispatch-orders/${id}/assign`, { vehicleId });

export const removeAssignedVehicle = (id: number, vehicleId: number) =>
    api.delete(`/dispatch-orders/${id}/assign/${vehicleId}`);

export const sendDispatchOrder = (id: number) =>
    api.post(`/dispatch-orders/${id}/send`);

export const updateVehicleStatus = (
    orderId: number,
    vehicleId: number,
    statusCode: number
) =>
    api.patch(`/dispatch-orders/${orderId}/vehicles/${vehicleId}/status`, {
        statusCode,
    });

export const endDispatchOrder = (id: number) =>
    api.patch(`/dispatch-orders/${id}/end`);

/** 차량별 현재 출동 정보 (OpenAPI: GET /api/dispatch-orders/vehicle/{vehicleId}) */
export const returnDispatchVehicles = (
    orderId: number,
    vehicleIds: number[]
) =>
    api.post(`/dispatch-orders/${orderId}/return`, { vehicleIds });

export const getCurrentDispatchByVehicle = (vehicleId: number) =>
    api.get<LatestDispatchResponse>(`/dispatch-orders/vehicle/${vehicleId}`);

/** @deprecated getCurrentDispatchByVehicle 사용 */
export const getLatestDispatchByVehicle = getCurrentDispatchByVehicle;

export function mapDispatchToVehicleFields(
    data: LatestDispatchResponse | null | undefined
): { dispatchPlace: string; content: string } | null {
    if (!data?.orderId) return null;

    const message = data.message ?? "";
    if (
        message.includes("출동 이력이 없습니다") ||
        message.includes("출동 상태가 아닙니다")
    ) {
        return null;
    }

    const dispatchPlace = data.address?.trim() ?? "";
    const content = data.content?.trim() ?? "";
    if (!dispatchPlace && !content) return null;

    return { dispatchPlace, content };
}
