import api from "./axios";

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
