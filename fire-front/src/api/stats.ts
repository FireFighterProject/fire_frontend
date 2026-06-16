import api from "./axios";
import type { ApiStats } from "./types";

export async function fetchStatsSummary(): Promise<ApiStats> {
    const res = await api.get<ApiStats>("/stats");
    return res.data ?? {};
}
