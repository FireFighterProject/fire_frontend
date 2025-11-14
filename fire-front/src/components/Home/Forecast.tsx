import React, { useEffect, useState } from "react";
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

// ✅ 환경변수 (Vite 기준)
// .env 파일에 다음 항목 추가
// VITE_WEATHER_API_KEY=4Q5DhMUXTayOQ4TFFy2sLw

const Forecast: React.FC = () => {
    const [mode, setMode] = useState<"current" | "hourly">("current");
    const [selectedRegion, setSelectedRegion] = useState("대구");
    const [loading, setLoading] = useState(false);
    const [weatherData, setWeatherData] = useState<any>(null);
    const [hourlyData, setHourlyData] = useState<any[]>([]);

    const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

    // 예보구역코드 매핑 (샘플)
    const regionCodes: Record<string, string> = {
        서울: "11B10101",
        부산: "11H20201",
        대구: "11H10701",
        광주: "11F20501",
        인천: "11B20201",
    };

    // === 데이터 불러오기 ===
    const fetchWeather = async () => {
        setLoading(true);
        try {
            const regCode = regionCodes[selectedRegion];
            const url = `/weather/fct_shrt_reg.php?reg=${regCode}&tmfc=0&disp=1&authKey=${API_KEY}`;
            const res = await fetch(url);
            const text = await res.text();

            // ⚙️ 기상청 API는 CSV 형식이므로 JSON 변환 필요
            const lines = text.trim().split("\n");
            const headers = lines[0].split(",");
            const rows = lines.slice(1).map((line) => {
                const values = line.split(",");
                return headers.reduce((obj: any, key, idx) => {
                    obj[key.trim()] = values[idx]?.trim();
                    return obj;
                }, {});
            });

            setWeatherData(rows[0]); // 가장 최근 데이터
            setHourlyData(
                rows.slice(0, 6).map((r) => ({
                    time: r.TM_EF?.slice(-4, -2) + "시",
                    temp: parseFloat(r.TA || "0"),
                }))
            );
        } catch (err) {
            console.error("날씨 데이터 불러오기 실패:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeather();
    }, [selectedRegion]);

    return (
        <div className="min-h-screen bg-[#f9fbfd] py-10 px-5">
            <div className="max-w-3xl mx-auto bg-white shadow-md rounded-3xl p-8">
                {/* ===== 헤더 ===== */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                        <Cloud className="w-6 h-6 text-blue-500" />
                        일기예보
                    </h2>
                    <span className="text-sm text-gray-400">
                        업데이트: {loading ? "로딩 중..." : "방금 전"}
                    </span>
                </div>
                
                {/* ===== 모드 전환 & 지역 선택 ===== */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex gap-2">
                        {["현재", "시간별"].map((label) => (
                            <button
                                key={label}
                                onClick={() =>
                                    setMode(label === "현재" ? "current" : "hourly")
                                }
                                className={`px-5 py-2.5 text-lg font-semibold rounded-md border transition-all ${mode === (label === "현재" ? "current" : "hourly")
                                        ? "bg-blue-500 text-white border-blue-500"
                                        : "bg-white border-gray-300 hover:border-blue-400"
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <label className="text-sm text-gray-600 font-medium">
                            지역 선택
                        </label>
                        <select
                            value={selectedRegion}
                            onChange={(e) => setSelectedRegion(e.target.value)}
                            className="ml-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 font-medium focus:outline-none focus:border-blue-500"
                        >
                            {Object.keys(regionCodes).map((region) => (
                                <option key={region}>{region}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ===== 현재 모드 ===== */}
                {mode === "current" && (
                    <>
                        <div className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 mb-8">
                            <div>
                                <h1 className="text-6xl font-extrabold text-blue-600">
                                    {weatherData ? `${weatherData.TA}°C` : "--°C"}
                                </h1>
                                <p className="text-gray-600 text-lg mt-1">
                                    {weatherData?.WF || "정보 없음"}
                                </p>
                            </div>
                            <img
                                src="https://cdn-icons-png.flaticon.com/512/869/869869.png"
                                alt="sun"
                                className="w-20 h-20"
                            />
                        </div>

                        {/* ===== 상세 카드 ===== */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-purple-50 rounded-2xl p-4 text-center">
                                <Droplets className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                                <p className="text-gray-600 text-sm font-medium">강수확률</p>
                                <p className="text-lg font-semibold text-gray-700">
                                    {weatherData?.ST || "0"}%
                                </p>
                            </div>
                            <div className="bg-cyan-50 rounded-2xl p-4 text-center">
                                <Wind className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
                                <p className="text-gray-600 text-sm font-medium">풍향</p>
                                <p className="text-lg font-semibold text-gray-700">
                                    {weatherData?.W1 || "--"}°
                                </p>
                            </div>
                            <div className="bg-pink-50 rounded-2xl p-4 text-center">
                                <MapPin className="w-6 h-6 text-pink-400 mx-auto mb-1" />
                                <p className="text-gray-600 text-sm font-medium">위치</p>
                                <p className="text-lg font-semibold text-gray-700">
                                    {selectedRegion}
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {/* ===== 시간별 모드 (그래프) ===== */}
                {mode === "hourly" && (
                    <div className="mt-8">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">
                            {selectedRegion} 시간별 온도 변화
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={hourlyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="time" stroke="#6b7280" />
                                    <YAxis
                                        domain={[0, 40]}
                                        stroke="#6b7280"
                                        tickFormatter={(v) => `${v}°`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#fff",
                                            borderRadius: "10px",
                                            border: "1px solid #ddd",
                                            fontSize: "14px",
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="temp"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={{ r: 5, fill: "#3b82f6" }}
                                        activeDot={{ r: 7 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Forecast;
