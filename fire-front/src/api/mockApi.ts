import type { InternalAxiosRequestConfig } from "axios";

const MOCK_ENABLED = import.meta.env.VITE_USE_MOCK_API === "true";

function normalizePath(url: string): string {
    const withoutQuery = url.split("?")[0] ?? url;
    const apiIndex = withoutQuery.indexOf("/api");
    const path =
        apiIndex >= 0
            ? withoutQuery.slice(apiIndex + 4)
            : withoutQuery.replace(/^\//, "");
    return path.startsWith("/") ? path : `/${path}`;
}

function getMockData(method: string, path: string): unknown {
    const m = method.toLowerCase();

    if (m === "get" && path === "/fire-stations") return [];
    if (m === "get" && /^\/fire-stations\/\d+$/.test(path)) {
        const id = Number(path.split("/").pop());
        return { id, sido: "서울", name: `소방서-${id}`, address: "" };
    }

    if (m === "get" && path === "/gps/all") return [];
    if (m === "get" && /^\/gps\/location\/\d+$/.test(path)) {
        const vehicleId = Number(path.split("/").pop());
        return {
            vehicleId,
            latitude: 37.5665,
            longitude: 126.978,
            updatedAt: new Date().toISOString(),
        };
    }

    if (m === "get" && path === "/vehicles") return [];
    if (m === "get" && path === "/stats") {
        return { firefighterCount: 0, totalVehicles: 0, activeVehicles: 0 };
    }
    if (m === "get" && path === "/logs") return [];
    if (m === "get" && path === "/dispatch-orders") return [];
    if (m === "get" && /^\/dispatch-orders\/vehicle\/\d+$/.test(path)) {
        return {
            orderId: null,
            address: null,
            content: null,
            message: "출동 상태가 아닙니다.",
        };
    }
    if (m === "get" && /^\/dispatch-orders\/\d+$/.test(path)) {
        return { id: Number(path.split("/").pop()), title: "", description: "", status: 0 };
    }

    if (m === "get" && path.startsWith("/weather/")) {
        const now = new Date();
        const y = now.getFullYear();
        const mth = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const date = `${y}${mth}${d}`;
        const hour = String(now.getHours()).padStart(2, "0") + "00";
        return {
            response: {
                header: { resultCode: "00", resultMsg: "OK" },
                body: {
                    items: {
                        item: [
                            { category: "TMP", fcstDate: date, fcstTime: hour, fcstValue: "22" },
                            { category: "SKY", fcstDate: date, fcstTime: hour, fcstValue: "1" },
                            { category: "PTY", fcstDate: date, fcstTime: hour, fcstValue: "0" },
                            { category: "POP", fcstDate: date, fcstTime: hour, fcstValue: "20" },
                            { category: "WSD", fcstDate: date, fcstTime: hour, fcstValue: "2" },
                            { category: "REH", fcstDate: date, fcstTime: hour, fcstValue: "55" },
                            { category: "TMN", fcstDate: date, fcstTime: "0600", fcstValue: "18" },
                            { category: "TMX", fcstDate: date, fcstTime: "1500", fcstValue: "26" },
                        ],
                    },
                },
            },
        };
    }

    if (["post", "patch", "put", "delete"].includes(m)) return { ok: true };

    return [];
}

export function isMockApiEnabled(): boolean {
    return MOCK_ENABLED;
}

export function resolveMockResponse(
    method: string,
    url: string
): { data: unknown; status: number } {
    const path = normalizePath(url);
    return { data: getMockData(method, path), status: 200 };
}

export function installApiMock(): void {
    if (!MOCK_ENABLED) return;

    console.info("[API Mock] 백엔드 미연결 — 목 데이터를 사용합니다.");

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.href;
        if (url.includes("/api/")) {
            const { data, status } = resolveMockResponse(init?.method ?? "GET", url);
            return new Response(JSON.stringify(data), {
                status,
                headers: { "Content-Type": "application/json" },
            });
        }
        return originalFetch(input, init);
    };
}

export async function mockAxiosAdapter(
    config: InternalAxiosRequestConfig
): Promise<{ data: unknown; status: number; statusText: string; headers: Record<string, string>; config: InternalAxiosRequestConfig }> {
    const base = config.baseURL ?? "";
    const url = `${base}${config.url ?? ""}`;
    const { data, status } = resolveMockResponse(config.method ?? "get", url);

    return {
        data,
        status,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        config,
    };
}
