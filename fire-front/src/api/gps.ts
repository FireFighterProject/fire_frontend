import api from "./axios";

export type GpsEntry = {
    vehicleId: number;
    latitude?: number;
    longitude?: number;
    [key: string]: unknown;
};

export async function fetchAllGps(): Promise<GpsEntry[]> {
    const res = await api.get<GpsEntry[]>("/gps/all");
    return res.data ?? [];
}

export const sendGpsPosition = (payload: {
    vehicleId: number;
    latitude: number;
    longitude: number;
    [key: string]: unknown;
}) => api.post("/gps/send", payload);
