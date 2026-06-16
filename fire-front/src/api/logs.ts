import api from "./axios";
import type { ApiLogEvent } from "./types";
import type { StatLog } from "../types/stats";

const formatDateParam = (d: Date) => d.toISOString().slice(0, 19);

export function buildStatLogs(events: ApiLogEvent[]): StatLog[] {
    return events.map((e) => {
        const date = e.eventTime.slice(0, 10);
        return {
            id: e.id,
            vehicleId: e.vehicleId,
            orderId: e.orderId,
            date,
            dispatchTime: e.eventTime,
            returnTime: e.eventTime,
            dispatchPlace: e.address,
            moved: false,
            minutes: 0,
            command: e.content,
            crewCount: 0,
        };
    });
}

export async function fetchLogs(from?: Date, to?: Date): Promise<ApiLogEvent[]> {
    const end = to ?? new Date();
    const start = from ?? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const res = await api.get<ApiLogEvent[]>("/logs", {
        params: {
            from: formatDateParam(start),
            to: formatDateParam(end),
        },
    });
    return res.data ?? [];
}

export async function fetchStatLogs(from?: Date, to?: Date): Promise<StatLog[]> {
    const events = await fetchLogs(from, to);
    return buildStatLogs(events);
}
