import { latLngToGrid } from "./grid";
import { formatPty, formatSky } from "./labels";
import {
    parseCurrentWeather,
    parseDailyForecast,
    parseHourlyForecast,
    type DailyForecast,
    type HourlyPoint,
} from "./parseForecast";

export type { DailyForecast, HourlyPoint };

export type WeatherItem = {
    category: string;
    fcstDate?: string;
    fcstTime: string;
    fcstValue: string;
};

type WeatherResponse = {
    response?: {
        header?: {
            resultCode?: string;
            resultMsg?: string;
        };
        body?: {
            items?: {
                item?: WeatherItem[];
            };
        };
    };
};

export type CurrentWeather = {
    temp: string;
    sky?: string;
    pty?: string;
    pop?: string;
    wsd?: string;
    reh?: string;
};

export type ShortTermForecast = {
    current: CurrentWeather;
    hourly: HourlyPoint[];
    daily: DailyForecast[];
};

export { formatPty, formatSky };

const PUBLISH_HOURS = [23, 20, 17, 14, 11, 8, 5, 2];
/** 발표 직후 데이터 미반영 구간(분) */
const PUBLISH_BUFFER_MIN = 50;

function formatBase(date: Date, hour: number) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return {
        baseDate: `${y}${m}${d}`,
        baseTime: String(hour).padStart(2, "0") + "00",
    };
}

/** 기상청 단기예보 발표 시각 후보 (최신 → 이전 순) */
export function listBaseDateTimeCandidates(now = new Date()) {
    const effective = new Date(now.getTime() - PUBLISH_BUFFER_MIN * 60 * 1000);
    const candidates: { baseDate: string; baseTime: string }[] = [];
    const seen = new Set<string>();

    for (let dayOffset = 0; dayOffset < 2; dayOffset += 1) {
        const date = new Date(effective);
        date.setDate(date.getDate() - dayOffset);

        const hourLimit = dayOffset === 0 ? effective.getHours() : 23;
        const hours =
            dayOffset === 0
                ? PUBLISH_HOURS.filter((h) => h <= hourLimit)
                : [...PUBLISH_HOURS];

        for (const hour of hours) {
            const candidate = formatBase(date, hour);
            const key = `${candidate.baseDate}:${candidate.baseTime}`;
            if (seen.has(key)) continue;
            seen.add(key);
            candidates.push(candidate);
        }
    }

    return candidates;
}

/** @deprecated listBaseDateTimeCandidates 사용 권장 */
export function getBaseDateTime(now = new Date()) {
    return listBaseDateTimeCandidates(now)[0] ?? formatBase(now, 2);
}

function isRetryableWeatherError(msg: string) {
    const lower = msg.toLowerCase();
    return (
        lower.includes("파라미터") ||
        lower.includes("parameter") ||
        lower.includes("데이터 없음") ||
        lower.includes("no data")
    );
}

function assertWeatherResponse(json: WeatherResponse) {
    const code = json?.response?.header?.resultCode;
    const msg = json?.response?.header?.resultMsg ?? "";

    if (code && code !== "00") {
        throw new Error(msg || `기상청 응답 오류 (${code})`);
    }

    const items = json?.response?.body?.items?.item;
    if (!items?.length) {
        throw new Error(msg || "기상청 데이터 없음");
    }
    return items;
}

export async function fetchVillageForecastRaw(
    nx: number,
    ny: number,
    options?: { baseDate?: string; baseTime?: string }
): Promise<WeatherItem[]> {
    const params = new URLSearchParams({
        baseDate: options?.baseDate ?? getBaseDateTime().baseDate,
        baseTime: options?.baseTime ?? getBaseDateTime().baseTime,
        nx: String(nx),
        ny: String(ny),
        pageNo: "1",
        numOfRows: "1000",
    });

    const res = await fetch(`/api/weather/village-forecast?${params}`);
    const json: WeatherResponse = await res.json().catch(() => ({}));

    if (!res.ok) {
        const msg =
            json?.response?.header?.resultMsg ||
            `기상청 API 요청 실패 (${res.status})`;
        throw new Error(msg);
    }

    return assertWeatherResponse(json);
}

export async function fetchShortTermForecastByLatLng(
    lat: number,
    lng: number
): Promise<ShortTermForecast> {
    const { nx, ny } = latLngToGrid(lat, lng);
    const candidates = listBaseDateTimeCandidates();

    let lastError: Error | null = null;

    for (const candidate of candidates) {
        try {
            const items = await fetchVillageForecastRaw(nx, ny, candidate);
            return {
                current: parseCurrentWeather(items),
                hourly: parseHourlyForecast(items),
                daily: parseDailyForecast(items),
            };
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            lastError = err;
            if (!isRetryableWeatherError(err.message)) break;
        }
    }

    throw lastError ?? new Error("날씨 정보를 불러오지 못했습니다.");
}

/** @deprecated fetchShortTermForecastByLatLng 사용 권장 */
export async function fetchWeatherByLatLng(
    lat: number,
    lng: number
): Promise<{ current: CurrentWeather; hourly: HourlyPoint[] }> {
    const data = await fetchShortTermForecastByLatLng(lat, lng);
    return { current: data.current, hourly: data.hourly };
}
