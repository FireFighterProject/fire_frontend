/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Cloud,
    Droplets,
    MapPin,
    Search,
    Wind,
    AlertTriangle,
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { useKakaoLoader } from "../../hooks/useKakaoLoader";
import {
    fetchWeatherByLatLng,
    formatPty,
    formatSky,
    type CurrentWeather,
    type HourlyPoint,
} from "../../services/weather/api";
import {
    DEFAULT_REGION,
    WEATHER_REGIONS,
} from "../../services/weather/regions";

type GeocoderExtended = {
    addressSearch: (
        query: string,
        cb: (result: { x: string; y: string; address_name: string }[], status: string) => void
    ) => void;
    coord2RegionCode: (
        lng: number,
        lat: number,
        cb: (result: { region_1depth_name: string; region_2depth_name?: string; region_3depth_name?: string }[], status: string) => void
    ) => void;
};

const Forecast: React.FC = () => {
    const mapReady = useKakaoLoader();
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapWrapperRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const skipCenterEventRef = useRef(false);
    const requestIdRef = useRef(0);

    const [mode, setMode] = useState<"current" | "hourly">("current");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPreset, setSelectedPreset] = useState("");
    const [locationName, setLocationName] = useState("위치 확인 중...");
    const [locating, setLocating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [updatedAt, setUpdatedAt] = useState("");
    const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
    const [hourlyData, setHourlyData] = useState<HourlyPoint[]>([]);

    const regionGroups = useMemo(() => {
        const groups = new Map<string, typeof WEATHER_REGIONS>();
        WEATHER_REGIONS.forEach((r) => {
            const list = groups.get(r.group) ?? [];
            list.push(r);
            groups.set(r.group, list);
        });
        return groups;
    }, []);

    const resolveRegionName = useCallback((lat: number, lng: number) => {
        if (!window.kakao?.maps?.services) return;
        const geocoder = new window.kakao.maps.services.Geocoder() as GeocoderExtended;
        geocoder.coord2RegionCode(lng, lat, (result, status) => {
            if (status !== window.kakao.maps.services.Status.OK || !result?.[0]) return;
            const r = result[0];
            const parts = [r.region_1depth_name, r.region_2depth_name, r.region_3depth_name]
                .filter(Boolean)
                .join(" ");
            if (parts) setLocationName(parts);
        });
    }, []);

    const loadWeather = useCallback(async (lat: number, lng: number) => {
        const reqId = ++requestIdRef.current;
        setLoading(true);
        setError("");

        try {
            const { current, hourly } = await fetchWeatherByLatLng(lat, lng);
            if (reqId !== requestIdRef.current) return;
            setCurrentWeather(current);
            setHourlyData(hourly);
            setUpdatedAt(
                new Date().toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                })
            );
        } catch (e) {
            if (reqId !== requestIdRef.current) return;
            console.error("날씨 오류:", e);
            setError("날씨 정보를 불러오지 못했습니다.");
        } finally {
            if (reqId === requestIdRef.current) setLoading(false);
        }
    }, []);

    const handleCenterUpdate = useCallback(
        (lat: number, lng: number, name?: string) => {
            if (name) setLocationName(name);
            else resolveRegionName(lat, lng);
            loadWeather(lat, lng);
        },
        [loadWeather, resolveRegionName]
    );

    const panTo = useCallback((lat: number, lng: number, name?: string) => {
        const map = mapRef.current;
        if (!map) return;

        skipCenterEventRef.current = true;
        const latlng = new window.kakao.maps.LatLng(lat, lng);
        map.panTo(latlng);

        if (name) setLocationName(name);
        handleCenterUpdate(lat, lng, name);

        window.setTimeout(() => {
            skipCenterEventRef.current = false;
        }, 500);
    }, [handleCenterUpdate]);

    /** 메인 진입 시(마운트) 현재 위치로 이동 — 다른 페이지 갔다 오면 컴포넌트가 다시 마운트됨 */
    const moveToCurrentLocation = useCallback(() => {
        setLocating(true);
        setError("");

        if (!navigator.geolocation) {
            setLocating(false);
            panTo(DEFAULT_REGION.lat, DEFAULT_REGION.lng, DEFAULT_REGION.name);
            setSelectedPreset(DEFAULT_REGION.name);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocating(false);
                setSelectedPreset("");
                panTo(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
                console.warn("현재 위치 조회 실패:", err);
                setLocating(false);
                setError("현재 위치를 가져오지 못해 기본 지역으로 표시합니다.");
                panTo(DEFAULT_REGION.lat, DEFAULT_REGION.lng, DEFAULT_REGION.name);
                setSelectedPreset(DEFAULT_REGION.name);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    }, [panTo]);

    useEffect(() => {
        if (!mapReady || !mapContainerRef.current || mapRef.current) return;

        let map: any = null;
        let onCenterChanged: (() => void) | null = null;
        let isMiddlePan = false;
        let isLeftPan = false;
        let lastPanX = 0;
        let lastPanY = 0;
        const wrapper = mapWrapperRef.current;

        const panByDelta = (dx: number, dy: number) => {
            if (!map) return;
            map.panBy(dx, dy);
        };

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (!map) return;

            const level = map.getLevel();
            const next = Math.min(14, Math.max(1, level + (e.deltaY > 0 ? 1 : -1)));
            if (next === level) return;

            const anchor = map.getCenter();
            map.setLevel(next, { anchor });
        };

        const onMouseDown = (e: MouseEvent) => {
            if (e.button === 0) {
                isLeftPan = true;
                lastPanX = e.clientX;
                lastPanY = e.clientY;
                return;
            }
            if (e.button !== 1) return;
            e.preventDefault();
            isMiddlePan = true;
            lastPanX = e.clientX;
            lastPanY = e.clientY;
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isMiddlePan && !isLeftPan) return;
            e.preventDefault();
            const dx = lastPanX - e.clientX;
            const dy = lastPanY - e.clientY;
            lastPanX = e.clientX;
            lastPanY = e.clientY;
            panByDelta(dx, dy);
        };

        const endPan = (e: MouseEvent) => {
            if (e.button === 0) isLeftPan = false;
            if (e.button === 1) isMiddlePan = false;
        };

        const onMouseLeave = () => {
            isLeftPan = false;
            isMiddlePan = false;
        };

        window.kakao.maps.load(() => {
            const container = mapContainerRef.current;
            if (!container || mapRef.current) return;

            const center = new window.kakao.maps.LatLng(
                DEFAULT_REGION.lat,
                DEFAULT_REGION.lng
            );
            map = new window.kakao.maps.Map(container, {
                center,
                level: 9,
                scrollwheel: false,
                draggable: false,
            });
            mapRef.current = map;

            map.addControl(
                new window.kakao.maps.ZoomControl(),
                window.kakao.maps.ControlPosition.RIGHT
            );

            onCenterChanged = () => {
                if (skipCenterEventRef.current) return;
                if (debounceRef.current) clearTimeout(debounceRef.current);

                debounceRef.current = setTimeout(() => {
                    const c = map.getCenter();
                    handleCenterUpdate(c.getLat(), c.getLng());
                }, 450);
            };

            window.kakao.maps.event.addListener(map, "center_changed", onCenterChanged);
            moveToCurrentLocation();
        });

        wrapper?.addEventListener("wheel", onWheel, { passive: false });
        wrapper?.addEventListener("mousedown", onMouseDown);
        wrapper?.addEventListener("mouseleave", onMouseLeave);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", endPan);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (map && onCenterChanged) {
                window.kakao?.maps?.event?.removeListener(map, "center_changed", onCenterChanged);
            }
            wrapper?.removeEventListener("wheel", onWheel);
            wrapper?.removeEventListener("mousedown", onMouseDown);
            wrapper?.removeEventListener("mouseleave", onMouseLeave);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", endPan);
            mapRef.current = null;
        };
    }, [mapReady, handleCenterUpdate, moveToCurrentLocation]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (!q || !window.kakao?.maps?.services) return;

        const geocoder = new window.kakao.maps.services.Geocoder() as GeocoderExtended;
        geocoder.addressSearch(q, (result, status) => {
            if (status !== window.kakao.maps.services.Status.OK || !result?.[0]) {
                setError(`'${q}' 검색 결과가 없습니다.`);
                return;
            }
            const lat = Number(result[0].y);
            const lng = Number(result[0].x);
            setSelectedPreset("");
            panTo(lat, lng, result[0].address_name);
        });
    };

    const handlePresetChange = (name: string) => {
        setSelectedPreset(name);
        const region = WEATHER_REGIONS.find((r) => r.name === name);
        if (!region) return;
        panTo(region.lat, region.lng, region.name);
    };

    const windSpeed = Number(currentWeather?.wsd ?? 0);
    const isWindAlert = windSpeed >= 10;
    const isRainAlert = Number(currentWeather?.pop ?? 0) >= 60;

    return (
        <div className="w-full bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
            {/* 상단: 검색 + 지역 선택 */}
            <div className="px-5 py-4 border-b bg-gray-50/80 flex flex-wrap items-center gap-3">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 shrink-0">
                    <Cloud className="w-5 h-5 text-blue-500" />
                    일기예보
                </h2>

                <form onSubmit={handleSearch} className="flex flex-1 min-w-[220px] gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="지역·주소 검색 (예: 의성군, 구미시)"
                            className="w-full h-9 pl-9 pr-3 border rounded-lg text-sm bg-white"
                        />
                    </div>
                    <button
                        type="submit"
                        className="h-9 px-4 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 shrink-0"
                    >
                        검색
                    </button>
                </form>

                <select
                    className="h-9 border rounded-lg px-3 text-sm bg-white min-w-[140px]"
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                >
                    <option value="">지역 바로가기</option>
                    {Array.from(regionGroups.entries()).map(([group, regions]) => (
                        <optgroup key={group} label={group}>
                            {regions.map((r) => (
                                <option key={r.name} value={r.name}>
                                    {r.name}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>

                <div className="flex gap-1 shrink-0">
                    {(["현재", "시간별"] as const).map((label) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() =>
                                setMode(label === "현재" ? "current" : "hourly")
                            }
                            className={`px-3 h-9 text-sm font-medium rounded-lg border ${
                                mode === (label === "현재" ? "current" : "hourly")
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-gray-700"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={moveToCurrentLocation}
                    disabled={locating}
                    className="h-9 px-3 text-sm font-medium rounded-lg border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 shrink-0"
                    title="현재 위치로 이동"
                >
                    {locating ? "위치 확인..." : "현재 위치"}
                </button>

                <span className="text-xs text-gray-400 shrink-0">
                    {locating ? "GPS 확인 중..." : updatedAt ? `${updatedAt} 기준` : ""}
                </span>
            </div>

            {/* 본문: 지도(왼쪽) + 날씨(오른쪽) */}
            <div className="flex flex-col lg:flex-row min-h-[500px]">
                {/* 지도 */}
                <div
                    ref={mapWrapperRef}
                    className="relative flex-1 min-h-[320px] lg:min-h-[500px] bg-gray-100 cursor-grab active:cursor-grabbing"
                >
                    {!mapReady && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm z-20 bg-gray-100">
                            지도 로딩 중...
                        </div>
                    )}
                    <div ref={mapContainerRef} className="absolute inset-0" />

                    {/* 중심 핀 */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none">
                        <MapPin className="w-9 h-9 text-red-500 drop-shadow-md fill-red-500" />
                        <div className="w-2 h-2 bg-red-500/40 rounded-full mx-auto -mt-1" />
                    </div>

                    <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow text-sm max-w-[70%]">
                        <p className="text-xs text-gray-500 mb-0.5">지도 중심 위치</p>
                        <p className="font-semibold text-gray-800 truncate">{locationName}</p>
                    </div>

                    <div className="absolute bottom-3 left-3 z-10 bg-black/60 text-white text-xs px-2.5 py-1.5 rounded-lg">
                        메인 재진입 시 현재 위치 · 지도 이동은 자유롭게 탐색 가능
                    </div>
                </div>

                {/* 날씨 패널 */}
                <div className="w-full lg:w-[min(440px,40%)] xl:w-[460px] border-t lg:border-t-0 lg:border-l p-5 flex flex-col">
                    {error && (
                        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}

                    {(isWindAlert || isRainAlert) && currentWeather && (
                        <div className="mb-3 flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                                {isWindAlert && `강풍 주의 (풍속 ${windSpeed}m/s)`}
                                {isWindAlert && isRainAlert && " · "}
                                {isRainAlert && `강수확률 ${currentWeather.pop}%`}
                            </span>
                        </div>
                    )}

                    {mode === "current" && currentWeather && (
                        <>
                            <div className="bg-gradient-to-br from-blue-50 to-sky-50 p-5 rounded-2xl mb-4">
                                <p className="text-sm text-gray-600 mb-1">{locationName}</p>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-5xl font-bold text-blue-600 leading-none">
                                            {currentWeather.temp}
                                            <span className="text-2xl">°C</span>
                                        </p>
                                        <p className="text-gray-700 mt-2 text-sm">
                                            {formatSky(currentWeather.sky)}
                                            {currentWeather.pty && currentWeather.pty !== "0"
                                                ? ` · ${formatPty(currentWeather.pty)}`
                                                : ""}
                                        </p>
                                    </div>
                                    <Cloud className="w-16 h-16 text-blue-300" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-purple-50 p-3 rounded-xl text-center">
                                    <Droplets className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                                    <p className="text-xs text-gray-600">강수확률</p>
                                    <p className="text-lg font-bold">{currentWeather.pop ?? "-"}%</p>
                                </div>
                                <div className="bg-cyan-50 p-3 rounded-xl text-center">
                                    <Wind className="w-5 h-5 mx-auto mb-1 text-cyan-600" />
                                    <p className="text-xs text-gray-600">풍속</p>
                                    <p className="text-lg font-bold">{currentWeather.wsd ?? "-"} m/s</p>
                                </div>
                                <div className="bg-pink-50 p-3 rounded-xl text-center">
                                    <MapPin className="w-5 h-5 mx-auto mb-1 text-pink-500" />
                                    <p className="text-xs text-gray-600">위치</p>
                                    <p className="text-sm font-bold truncate" title={locationName}>
                                        {locationName}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                    {mode === "hourly" && (
                        <div className="flex-1 flex flex-col min-h-[280px]">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                {locationName} · 시간별 기온
                            </h3>
                            {hourlyData.length > 0 ? (
                                <div className="flex-1 min-h-[240px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={hourlyData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} unit="°" />
                                            <Tooltip
                                                formatter={(v: number) => [`${v}°C`, "기온"]}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="temp"
                                                stroke="#2563eb"
                                                strokeWidth={2.5}
                                                dot={{ r: 3 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">데이터 없음</p>
                            )}
                        </div>
                    )}

                    {!currentWeather && !loading && !error && (
                        <p className="text-sm text-gray-400 text-center py-10">
                            지도를 이동하거나 지역을 검색해 주세요.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Forecast;
