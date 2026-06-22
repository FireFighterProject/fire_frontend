import type { WeatherItem } from "./api";
import { formatPty, formatSky } from "./labels";

export type HourlyPoint = {
    time: string;
    temp: number;
    pop?: number;
    sky?: string;
    pty?: string;
};

export type DailyForecast = {
    date: string;
    label: string;
    minTemp?: number;
    maxTemp?: number;
    skyLabel: string;
    ptyLabel: string;
    maxPop: number;
};

function formatDateLabel(dateStr: string, index: number): string {
    if (index === 0) return "오늘";
    if (index === 1) return "내일";
    if (index === 2) return "모레";

    const m = dateStr.slice(4, 6);
    const d = dateStr.slice(6, 8);
    return `${m}/${d}`;
}

function pickValue(
    items: WeatherItem[],
    fcstDate: string,
    category: string,
    fcstTime?: string
): string | undefined {
    const found = items.find(
        (item) =>
            item.category === category &&
            (item as WeatherItem & { fcstDate?: string }).fcstDate === fcstDate &&
            (!fcstTime || item.fcstTime === fcstTime)
    );
    return found?.fcstValue;
}

export function parseHourlyForecast(items: WeatherItem[]): HourlyPoint[] {
    const now = new Date();
    const nowHM = Number(
        `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`
    );

    const tmpList = items
        .filter((d) => d.category === "TMP")
        .filter((d) => Number(d.fcstTime) >= nowHM - 100)
        .sort((a, b) => Number(a.fcstTime) - Number(b.fcstTime));

    return tmpList.slice(0, 12).map((d) => {
        const fcstDate = (d as WeatherItem & { fcstDate?: string }).fcstDate;
        const sky = items.find(
            (x) =>
                x.category === "SKY" &&
                x.fcstTime === d.fcstTime &&
                (x as WeatherItem & { fcstDate?: string }).fcstDate === fcstDate
        )?.fcstValue;
        const pty = items.find(
            (x) =>
                x.category === "PTY" &&
                x.fcstTime === d.fcstTime &&
                (x as WeatherItem & { fcstDate?: string }).fcstDate === fcstDate
        )?.fcstValue;

        return {
            time: `${d.fcstTime.slice(0, 2)}시`,
            temp: Number(d.fcstValue),
            pop: Number(
                items.find(
                    (x) =>
                        x.category === "POP" &&
                        x.fcstTime === d.fcstTime &&
                        (x as WeatherItem & { fcstDate?: string }).fcstDate === fcstDate
                )?.fcstValue ?? 0
            ),
            sky: formatSky(sky),
            pty: pty && pty !== "0" ? formatPty(pty) : undefined,
        };
    });
}

function deriveMinMaxFromTmp(items: WeatherItem[], date: string) {
    const temps = items
        .filter(
            (item) =>
                item.category === "TMP" &&
                (item as WeatherItem & { fcstDate?: string }).fcstDate === date
        )
        .map((item) => Number(item.fcstValue))
        .filter((v) => !Number.isNaN(v));

    if (!temps.length) {
        return { minTemp: undefined, maxTemp: undefined };
    }

    return {
        minTemp: Math.min(...temps),
        maxTemp: Math.max(...temps),
    };
}

export function parseDailyForecast(items: WeatherItem[]): DailyForecast[] {
    const dates = Array.from(
        new Set(
            items
                .map((item) => (item as WeatherItem & { fcstDate?: string }).fcstDate)
                .filter((v): v is string => Boolean(v))
        )
    ).sort();

    return dates.slice(0, 3).map((date, index) => {
        const tmn = pickValue(items, date, "TMN", "0600") ?? pickValue(items, date, "TMN");
        const tmx = pickValue(items, date, "TMX", "1500") ?? pickValue(items, date, "TMX");
        const sky = pickValue(items, date, "SKY", "1200") ?? pickValue(items, date, "SKY", "1500");
        const pty = pickValue(items, date, "PTY", "1200") ?? pickValue(items, date, "PTY", "1500");

        let minTemp = tmn ? Number(tmn) : undefined;
        let maxTemp = tmx ? Number(tmx) : undefined;

        // 오늘은 TMN/TMX가 비는 경우가 많아 당일 시간별 기온(TMP)으로 보완
        if (minTemp == null || maxTemp == null) {
            const derived = deriveMinMaxFromTmp(items, date);
            minTemp = minTemp ?? derived.minTemp;
            maxTemp = maxTemp ?? derived.maxTemp;
        }

        const pops = items
            .filter(
                (item) =>
                    item.category === "POP" &&
                    (item as WeatherItem & { fcstDate?: string }).fcstDate === date
            )
            .map((item) => Number(item.fcstValue))
            .filter((v) => !Number.isNaN(v));

        return {
            date,
            label: formatDateLabel(date, index),
            minTemp,
            maxTemp,
            skyLabel: formatSky(sky),
            ptyLabel: pty && pty !== "0" ? formatPty(pty) : "없음",
            maxPop: pops.length ? Math.max(...pops) : 0,
        };
    });
}

export function parseCurrentWeather(items: WeatherItem[]) {
    const now = new Date();
    const nowHM = Number(now.getHours().toString().padStart(2, "0") + "00");

    const tmpList = items.filter((d) => d.category === "TMP");
    if (!tmpList.length) throw new Error("온도 데이터 없음");

    const closest = tmpList.reduce((prev, curr) => {
        const diffPrev = Math.abs(Number(prev.fcstTime) - nowHM);
        const diffCurr = Math.abs(Number(curr.fcstTime) - nowHM);
        return diffCurr < diffPrev ? curr : prev;
    });

    const fcstDate = (closest as WeatherItem & { fcstDate?: string }).fcstDate;

    const pick = (cat: string) =>
        items.find(
            (d) =>
                d.category === cat &&
                d.fcstTime === closest.fcstTime &&
                (d as WeatherItem & { fcstDate?: string }).fcstDate === fcstDate
        )?.fcstValue;

    return {
        temp: closest.fcstValue,
        sky: pick("SKY"),
        pty: pick("PTY"),
        pop: pick("POP"),
        wsd: pick("WSD"),
        reh: pick("REH"),
    };
}
