import React, { useEffect, useState, useCallback } from "react";
import { Cloud, MapPin, Droplets, Wind } from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

/* ------------------------------
    타입 정의
------------------------------ */
type WeatherItem = {
    baseDate: string;
    baseTime: string;
    category: string;
    fcstDate: string;
    fcstTime: string; // HHMM
    fcstValue: string;
    nx: number;
    ny: number;
};

type WeatherResponse = {
    response: {
        body: {
            items: {
                item: WeatherItem[];
            };
        };
    };
};

type CurrentWeather = {
    temp: string;
    sky?: string;
    pty?: string;
    pop?: string;
    wsd?: string;
};

type HourlyPoint = {
    time: string;
    temp: number;
};

/* ------------------------------ */

const Forecast: React.FC = () => {
    const [mode, setMode] = useState<"current" | "hourly">("current");
    const [selectedRegion, setSelectedRegion] = useState("대구");
    const [loading, setLoading] = useState(false);
    const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
    const [hourlyData, setHourlyData] = useState<HourlyPoint[]>([]);

    // 지역 → 격자 좌표
    const regionCoords: Record<string, { nx: number; ny: number }> = {
        서울: { nx: 60, ny: 127 },
        부산: { nx: 98, ny: 76 },
        대구: { nx: 89, ny: 90 },
        광주: { nx: 58, ny: 74 },
        인천: { nx: 55, ny: 124 },
    };

    // 발표 시각 계산
    const getBaseDateTime = () => {
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
    };

    /* ------------------------------
        기상 데이터 호출
    ------------------------------ */
    const fetchWeather = useCallback(async () => {
        setLoading(true);

        try {
            const { nx, ny } = regionCoords[selectedRegion];
            const { baseDate, baseTime } = getBaseDateTime();

            const url = `/api/weather/village-forecast?baseDate=${baseDate}&baseTime=${baseTime}&nx=${nx}&ny=${ny}`;

            const res = await fetch(url);
            const json: WeatherResponse = await res.json();

            const items = json?.response?.body?.items?.item;
            if (!items) throw new Error("기상청 데이터 없음");

            // 현재 시간과 가장 가까운 예보시간
            const now = new Date();
            const nowHM = Number(now.getHours().toString().padStart(2, "0") + "00");

            const tmpList = items.filter((d) => d.category === "TMP");
            if (tmpList.length === 0) return;

            const closest = tmpList.reduce((prev, curr) => {
                const diffPrev = Math.abs(Number(prev.fcstTime) - nowHM);
                const diffCurr = Math.abs(Number(curr.fcstTime) - nowHM);
                return diffCurr < diffPrev ? curr : prev;
            });

            const sky = items.find((d) => d.category === "SKY" && d.fcstTime === closest.fcstTime)?.fcstValue;
            const pty = items.find((d) => d.category === "PTY" && d.fcstTime === closest.fcstTime)?.fcstValue;
            const pop = items.find((d) => d.category === "POP" && d.fcstTime === closest.fcstTime)?.fcstValue;
            const wsd = items.find((d) => d.category === "WSD" && d.fcstTime === closest.fcstTime)?.fcstValue;

            setCurrentWeather({
                temp: closest.fcstValue,
                sky,
                pty,
                pop,
                wsd,
            });

            // 시간별 그래프 데이터
            const hourly = tmpList.slice(0, 8).map((d) => ({
                time: d.fcstTime.slice(0, 2) + "시",
                temp: Number(d.fcstValue),
            }));

            setHourlyData(hourly);
        } catch (e) {
            console.error("날씨 오류:", e);
        } finally {
            setLoading(false);
        }
    }, [selectedRegion]);

    useEffect(() => {
        fetchWeather();
    }, [fetchWeather]);

    return (
        <div className="min-w-xl mx-auto bg-white shadow-md rounded-3xl p-8">
            {/* 제목 */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                    <Cloud className="w-6 h-6 text-blue-500" />
                    일기예보
                </h2>
                <span className="text-sm text-gray-400">
                    {loading ? "로딩 중..." : "업데이트 완료"}
                </span>
            </div>

            {/* 모드 선택 */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                    {["현재", "시간별"].map((label) => (
                        <button
                            key={label}
                            onClick={() =>
                                setMode(label === "현재" ? "current" : "hourly")
                            }
                            className={`px-4 py-2 font-semibold rounded-md border ${mode === (label === "현재" ? "current" : "hourly")
                                    ? "bg-blue-500 text-white"
                                    : "bg-white text-gray-700"
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* 지역 선택 */}
                <select
                    className="border px-3 py-2 rounded-lg"
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                >
                    {Object.keys(regionCoords).map((r) => (
                        <option key={r}>{r}</option>
                    ))}
                </select>
            </div>

            {/* 현재 날씨 */}
            {mode === "current" && currentWeather && (
                <div>
                    <div className="bg-blue-50 p-6 rounded-2xl flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-6xl font-bold text-blue-600">
                                {currentWeather.temp}°C
                            </h1>
                            <p className="text-gray-700 mt-1">
                                하늘: {currentWeather.sky} / 강수형태: {currentWeather.pty}
                            </p>
                        </div>
                        <img
                            src="https://cdn-icons-png.flaticon.com/512/869/869869.png"
                            className="w-20 h-20"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-purple-50 p-4 rounded-xl text-center">
                            <Droplets className="mx-auto mb-1" />
                            <p>강수확률</p>
                            <p className="text-lg font-bold">{currentWeather.pop}%</p>
                        </div>

                        <div className="bg-cyan-50 p-4 rounded-xl text-center">
                            <Wind className="mx-auto mb-1" />
                            <p>풍속</p>
                            <p className="text-lg font-bold">{currentWeather.wsd} m/s</p>
                        </div>

                        <div className="bg-pink-50 p-4 rounded-xl text-center">
                            <MapPin className="mx-auto mb-1" />
                            <p>위치</p>
                            <p className="text-lg font-bold">{selectedRegion}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 시간별 그래프 */}
            {mode === "hourly" && (
                <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-3">{selectedRegion} 시간별 온도</h3>

                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={hourlyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis />
                                <Tooltip />
                                <Line
                                    type="monotone"
                                    dataKey="temp"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Forecast;
