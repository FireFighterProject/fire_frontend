import { latLngToGrid } from "./grid";

export type WeatherItem = {
    category: string;
    fcstTime: string;
    fcstValue: string;
};

type WeatherResponse = {
    response?: {
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
};

export type HourlyPoint = {
    time: string;
    temp: number;
    pop?: number;
};

const SKY_LABELS: Record<string, string> = {
    "1": "맑음",
    "2": "구름많음",
    "3": "흐림",
    "4": "흐림",
};

const PTY_LABELS: Record<string, string> = {
    "0": "없음",
    "1": "비",
    "2": "비/눈",
    "3": "눈",
    "4": "소나기",
};

export function formatSky(value?: string): string {
    if (!value) return "-";
    return SKY_LABELS[value] ?? value;
}

export function formatPty(value?: string): string {
    if (!value) return "-";
    return PTY_LABELS[value] ?? value;
}

function getBaseDateTime() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, "");
    const hours = now.getHours();
    const availableTimes = [2, 5, 8, 11, 14, 17, 20, 23];
    const baseHour =
        availableTimes.filter((t) => t <= hours).slice(-1)[0] ??
        availableTimes[availableTimes.length - 1];

    return {
        baseDate: date,
        baseTime: String(baseHour).padStart(2, "0") + "00",
    };
}

export async function fetchWeatherByLatLng(
    lat: number,
    lng: number
): Promise<{ current: CurrentWeather; hourly: HourlyPoint[] }> {
    const { nx, ny } = latLngToGrid(lat, lng);
    const { baseDate, baseTime } = getBaseDateTime();

    const url = `/api/weather/village-forecast?baseDate=${baseDate}&baseTime=${baseTime}&nx=${nx}&ny=${ny}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("기상청 API 요청 실패");

    const json: WeatherResponse = await res.json();
    const items = json?.response?.body?.items?.item;
    if (!items?.length) throw new Error("기상청 데이터 없음");

    const now = new Date();
    const nowHM = Number(now.getHours().toString().padStart(2, "0") + "00");

    const tmpList = items.filter((d) => d.category === "TMP");
    if (tmpList.length === 0) throw new Error("온도 데이터 없음");

    const closest = tmpList.reduce((prev, curr) => {
        const diffPrev = Math.abs(Number(prev.fcstTime) - nowHM);
        const diffCurr = Math.abs(Number(curr.fcstTime) - nowHM);
        return diffCurr < diffPrev ? curr : prev;
    });

    const pick = (cat: string) =>
        items.find((d) => d.category === cat && d.fcstTime === closest.fcstTime)
            ?.fcstValue;

    const hourly = tmpList.slice(0, 12).map((d) => ({
        time: `${d.fcstTime.slice(0, 2)}시`,
        temp: Number(d.fcstValue),
        pop: Number(
            items.find(
                (x) => x.category === "POP" && x.fcstTime === d.fcstTime
            )?.fcstValue ?? 0
        ),
    }));

    return {
        current: {
            temp: closest.fcstValue,
            sky: pick("SKY"),
            pty: pick("PTY"),
            pop: pick("POP"),
            wsd: pick("WSD"),
        },
        hourly,
    };
}
