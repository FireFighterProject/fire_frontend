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
    Search,
    Wind,
    AlertTriangle,
} from "lucide-react";
import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ComposedChart,
    Area,
} from "recharts";
import { useKakaoLoader } from "../../hooks/useKakaoLoader";
import {
    fetchShortTermForecastByLatLng,
    formatPty,
    formatSky,
    type CurrentWeather,
    type HourlyPoint,
} from "../../services/weather/api";
import type { DailyForecast } from "../../services/weather/parseForecast";
import { useKakaoRadarOverlay } from "../../hooks/useKakaoRadarOverlay";
import ForecastMapPanel from "./ForecastMapPanel";
import {
    DEFAULT_REGION,
    WEATHER_REGIONS,
} from "../../services/weather/regions";
import {
    isInKoreaRadarCoverage,
    KOREA_RADAR_CENTER,
    RADAR_VIEW_LEVEL,
} from "../../services/weather/radarTiles";

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

const PRIMARY = "#1a56db";
const TEMP_COLOR = "#1a3c6e";
const ACCENT_WARM = "#f59e0b";
const PAGE_BG = "#f0f4f8";
const CARD_SHADOW = "0 1px 4px rgba(0,0,0,0.08)";

function getDailyCardGradient(skyLabel: string, ptyLabel: string) {
    const isRainy = ptyLabel !== "없음" && ptyLabel !== "-";
    const isCloudy = skyLabel === "흐림" || skyLabel === "구름많음";

    if (isRainy) {
        return "bg-gradient-to-br from-[#bfdbfe] via-[#60a5fa]/40 to-[#1d4ed8]/15 border-blue-200/70";
    }
    if (isCloudy) {
        return "bg-gradient-to-br from-[#e2e8f0] via-[#cbd5e1]/80 to-[#94a3b8]/25 border-slate-200/80";
    }
    return "bg-gradient-to-br from-[#e0f2fe] via-[#f0f9ff] to-white border-sky-100";
}

function DailyTempDisplay({
    day,
}: {
    day: DailyForecast;
}) {
    const hasTemp = day.minTemp != null && day.maxTemp != null;

    return (
        <div className="mt-2 flex h-8 items-center justify-center">
            {hasTemp ? (
                <p className="text-2xl font-bold" style={{ color: TEMP_COLOR }}>
                    {day.minTemp}° / {day.maxTemp}°
                </p>
            ) : day.label === "오늘" ? (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gray-400 opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-gray-500" />
                    </span>
                    현재 측정 중
                </div>
            ) : (
                <p className="text-2xl font-bold text-gray-300">-</p>
            )}
        </div>
    );
}

function DailyForecastSkeleton({ compact = false }: { compact?: boolean }) {
    const rows = ["오늘", "내일", "모레"];
    if (compact) {
        return (
            <div className="space-y-2">
                {rows.map((label) => (
                    <div
                        key={label}
                        className="flex h-[58px] animate-pulse items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3"
                    >
                        <span className="h-4 w-10 rounded bg-gray-200" />
                        <div className="flex-1 space-y-2">
                            <span className="block h-3 w-16 rounded bg-gray-200" />
                            <span className="block h-2.5 w-24 rounded bg-gray-200" />
                        </div>
                        <div className="space-y-1.5 text-right">
                            <span className="block h-4 w-14 rounded bg-gray-200" />
                            <span className="ml-auto block h-3 w-8 rounded bg-gray-200" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {rows.map((label) => (
                <div
                    key={label}
                    className="h-[168px] animate-pulse rounded-xl border border-gray-100 bg-gray-50/80 p-4"
                >
                    <span className="mx-auto block h-4 w-10 rounded bg-gray-200" />
                    <span className="mx-auto mt-4 block h-8 w-20 rounded bg-gray-200" />
                    <span className="mx-auto mt-3 block h-3 w-14 rounded bg-gray-200" />
                </div>
            ))}
        </div>
    );
}

function CurrentWeatherSkeleton() {
    return (
        <div className="flex flex-1 flex-col animate-pulse">
            <div
                className="mb-4 rounded-2xl border border-gray-100 bg-white p-5"
                style={{ boxShadow: CARD_SHADOW }}
            >
                <span className="mb-2 block h-3 w-32 rounded bg-gray-200" />
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-3">
                        <span className="block h-12 w-28 rounded bg-gray-200" />
                        <span className="block h-4 w-20 rounded bg-gray-200" />
                    </div>
                    <span className="mt-1 h-9 w-9 rounded-full bg-gray-200" />
                </div>
            </div>
            <ul className="space-y-2.5 rounded-2xl border border-gray-100 bg-white p-4">
                {[1, 2, 3].map((i) => (
                    <li
                        key={i}
                        className={`flex items-center justify-between ${i > 1 ? "border-t border-gray-100 pt-2.5" : ""}`}
                    >
                        <span className="h-4 w-20 rounded bg-gray-200" />
                        <span className="h-4 w-12 rounded bg-gray-200" />
                    </li>
                ))}
            </ul>
        </div>
    );
}

function WeatherAlertBar({
    show,
    windSpeed,
}: {
    show: boolean;
    windSpeed: number;
}) {
    if (!show) return null;

    return (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="truncate">강풍 주의 (풍속 {windSpeed}m/s)</span>
        </div>
    );
}

function DailyForecastPanel({
    days,
    loading,
    compact = false,
}: {
    days: DailyForecast[];
    loading: boolean;
    compact?: boolean;
}) {
    if (days.length === 0) {
        if (loading) {
            return <DailyForecastSkeleton compact={compact} />;
        }
        return (
            <div className={compact ? "space-y-2" : ""}>
                {compact ? (
                    <DailyForecastSkeleton compact />
                ) : (
                    <p className="py-6 text-center text-sm text-gray-400">
                        지도를 이동하면 해당 지역 단기예보가 표시됩니다.
                    </p>
                )}
            </div>
        );
    }

    if (compact) {
        return (
            <div className="space-y-2">
                {days.map((day) => (
                    <div
                        key={day.date}
                        className={`flex h-[58px] items-center gap-3 rounded-xl border px-3 py-2.5 ${getDailyCardGradient(day.skyLabel, day.ptyLabel)}`}
                    >
                        <span className="w-10 shrink-0 text-sm font-bold text-gray-800">
                            {day.label}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] uppercase tracking-wide text-gray-500">
                                {day.skyLabel}
                            </p>
                            <p className="truncate text-xs text-gray-600">
                                {day.ptyLabel !== "없음" ? day.ptyLabel : "강수 없음"}
                            </p>
                        </div>
                        <div className="flex w-[72px] shrink-0 flex-col items-end justify-center">
                            <div className="flex h-5 items-center">
                                {day.minTemp != null && day.maxTemp != null ? (
                                    <p
                                        className="text-sm font-bold leading-none"
                                        style={{ color: TEMP_COLOR }}
                                    >
                                        {day.minTemp}° / {day.maxTemp}°
                                    </p>
                                ) : day.label === "오늘" ? (
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gray-400 opacity-60" />
                                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gray-500" />
                                        </span>
                                        측정 중
                                    </div>
                                ) : (
                                    <p className="text-sm font-bold leading-none text-gray-300">-</p>
                                )}
                            </div>
                            <p
                                className="mt-0.5 text-xs font-semibold leading-none"
                                style={{ color: "#b45309" }}
                            >
                                {day.maxPop}%
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {days.map((day) => (
                <div
                    key={day.date}
                    className={`rounded-xl border p-4 text-center ${getDailyCardGradient(day.skyLabel, day.ptyLabel)}`}
                    style={{ boxShadow: CARD_SHADOW }}
                >
                    <p className="text-sm font-bold text-gray-800">{day.label}</p>
                    <DailyTempDisplay day={day} />
                    <p className="mt-2 text-[13px] font-normal uppercase tracking-wide text-gray-500">
                        {day.skyLabel}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                        {day.ptyLabel !== "없음" ? day.ptyLabel : "강수 없음"}
                    </p>
                    <p
                        className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{
                            backgroundColor: `${ACCENT_WARM}22`,
                            color: "#b45309",
                        }}
                    >
                        강수확률 {day.maxPop}%
                    </p>
                </div>
            ))}
        </div>
    );
}

const Forecast: React.FC = () => {
    const mapReady = useKakaoLoader();
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapWrapperRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const [mapInstance, setMapInstance] = useState<any>(null);
    const [radarOn, setRadarOn] = useState(false);
    const radarOnRef = useRef(false);
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
    const [dailyForecast, setDailyForecast] = useState<DailyForecast[]>([]);

    const { status: radarStatus, error: radarError } = useKakaoRadarOverlay(
        mapInstance,
        mapContainerRef,
        radarOn
    );

    radarOnRef.current = radarOn;

    /** 최대 축소(레벨 14)가 아니면 강수 레이더 자동 OFF */
    useEffect(() => {
        if (!mapInstance || !window.kakao?.maps) return;

        const onZoomChanged = () => {
            if (radarOnRef.current && mapInstance.getLevel() !== RADAR_VIEW_LEVEL) {
                setRadarOn(false);
            }
        };

        window.kakao.maps.event.addListener(mapInstance, "zoom_changed", onZoomChanged);
        return () => {
            window.kakao.maps.event.removeListener(mapInstance, "zoom_changed", onZoomChanged);
        };
    }, [mapInstance]);

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
            const { current, hourly, daily } = await fetchShortTermForecastByLatLng(lat, lng);
            if (reqId !== requestIdRef.current) return;
            setCurrentWeather(current);
            setHourlyData(hourly);
            setDailyForecast(daily);
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

    /** 강수 레이더 ON 시 커버리지·줌 맞춤 이동 */
    const moveToRadarView = useCallback(() => {
        const map = mapRef.current;
        if (!map || !window.kakao?.maps) return;

        const center = map.getCenter();
        let lat = center.getLat();
        let lng = center.getLng();
        let name: string | undefined;

        if (!isInKoreaRadarCoverage(lat, lng)) {
            lat = KOREA_RADAR_CENTER.lat;
            lng = KOREA_RADAR_CENTER.lng;
            name = KOREA_RADAR_CENTER.name;
        }

        skipCenterEventRef.current = true;
        const latlng = new window.kakao.maps.LatLng(lat, lng);
        map.panTo(latlng);
        map.setLevel(RADAR_VIEW_LEVEL, { anchor: latlng });

        if (name) setLocationName(name);
        handleCenterUpdate(lat, lng, name);

        window.setTimeout(() => {
            skipCenterEventRef.current = false;
            map.relayout();
        }, 500);
    }, [handleCenterUpdate]);

    const handleToggleRadar = useCallback(() => {
        if (radarOn) {
            setRadarOn(false);
            return;
        }
        setRadarOn(true);
        window.requestAnimationFrame(() => moveToRadarView());
    }, [radarOn, moveToRadarView]);

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
        const wrapper = mapWrapperRef.current;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (!map) return;

            const level = map.getLevel();
            const next = Math.min(14, Math.max(1, level + (e.deltaY > 0 ? 1 : -1)));
            if (next === level) return;

            const anchor = map.getCenter();
            map.setLevel(next, { anchor });

            if (next !== RADAR_VIEW_LEVEL && radarOnRef.current) {
                setRadarOn(false);
            }
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
                draggable: true,
                zoomable: true,
            });
            map.setDraggable(true);
            map.setZoomable(true);
            mapRef.current = map;
            setMapInstance(map);

            requestAnimationFrame(() => map.relayout());

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

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (map && onCenterChanged) {
                window.kakao?.maps?.event?.removeListener(map, "center_changed", onCenterChanged);
            }
            wrapper?.removeEventListener("wheel", onWheel);
            mapRef.current = null;
            setMapInstance(null);
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

    const hourlyChartData = useMemo(() => {
        const seen = new Set<string>();
        return hourlyData
            .map((point) => {
                const hour = point.time.replace(/시$/, "");
                return { ...point, hourLabel: `${hour}시` };
            })
            .filter((point) => {
                if (seen.has(point.hourLabel)) return false;
                seen.add(point.hourLabel);
                return true;
            });
    }, [hourlyData]);

    const hourlyYMin = useMemo(() => {
        if (!hourlyChartData.length) return 0;
        return Math.floor(Math.min(...hourlyChartData.map((d) => d.temp)) - 2);
    }, [hourlyChartData]);

    return (
        <div
            className="w-full overflow-hidden rounded-2xl border border-gray-200/80"
            style={{ backgroundColor: PAGE_BG, boxShadow: CARD_SHADOW }}
        >
            {/* 상단: 검색 + 지역 선택 */}
            <div
                className="flex flex-wrap items-center gap-3 border-b border-gray-200/60 px-5 py-4"
                style={{ backgroundColor: "#ffffff" }}
            >
                <h2 className="flex shrink-0 items-center gap-2 text-lg font-bold text-gray-800">
                    <Cloud className="h-5 w-5" style={{ color: PRIMARY }} />
                    기상정보 · 단기예보
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
                        className="h-9 shrink-0 rounded-lg px-4 text-sm text-white hover:opacity-90"
                        style={{ backgroundColor: PRIMARY }}
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
                            className={`h-9 rounded-lg border px-3 text-sm font-medium ${
                                mode === (label === "현재" ? "current" : "hourly")
                                    ? "border-transparent text-white"
                                    : "bg-white text-gray-700"
                            }`}
                            style={
                                mode === (label === "현재" ? "current" : "hourly")
                                    ? { backgroundColor: PRIMARY }
                                    : undefined
                            }
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

            {/* 본문: 지도(60%) + 날씨(40%) */}
            <div
                className="flex min-h-[500px] flex-col lg:flex-row"
                style={{ backgroundColor: PAGE_BG }}
            >
                <div className="w-full lg:w-[60%] lg:shrink-0">
                    <ForecastMapPanel
                        mapWrapperRef={mapWrapperRef}
                        mapContainerRef={mapContainerRef}
                        mapReady={mapReady}
                        locationName={locationName}
                        radarOn={radarOn}
                        onToggleRadar={handleToggleRadar}
                        radarStatus={radarStatus}
                        radarError={radarError}
                    />
                </div>

                {/* 날씨 패널 */}
                <div
                    className="flex w-full min-h-[500px] flex-col border-t border-gray-200/60 bg-white p-5 lg:w-[40%] lg:border-l lg:border-t-0"
                    style={{ boxShadow: CARD_SHADOW }}
                >
                    {error ? (
                        <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                            {error}
                        </div>
                    ) : null}

                    <WeatherAlertBar
                        show={Boolean(currentWeather && isWindAlert)}
                        windSpeed={windSpeed}
                    />

                    <div className="flex-1">
                    {mode === "current" && (
                        currentWeather ? (
                        <div
                            className={`flex flex-col transition-opacity duration-200 ${loading ? "opacity-70" : "opacity-100"}`}
                        >
                            <div
                                className="mb-4 rounded-2xl border border-gray-100 bg-white p-5"
                                style={{ boxShadow: CARD_SHADOW }}
                            >
                                <p
                                    className="mb-2 truncate text-gray-500"
                                    style={{ fontSize: "12px" }}
                                >
                                    {locationName}
                                </p>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p
                                            className="leading-none"
                                            style={{
                                                fontSize: "3rem",
                                                fontWeight: 700,
                                                color: TEMP_COLOR,
                                            }}
                                        >
                                            {currentWeather.temp}
                                            <span className="text-2xl font-bold">°C</span>
                                        </p>
                                        <p
                                            className="mt-2 uppercase tracking-wide text-gray-500"
                                            style={{
                                                fontSize: "13px",
                                                fontWeight: 400,
                                            }}
                                        >
                                            {formatSky(currentWeather.sky)}
                                            {currentWeather.pty && currentWeather.pty !== "0"
                                                ? ` · ${formatPty(currentWeather.pty)}`
                                                : ""}
                                        </p>
                                    </div>
                                    <Cloud
                                        className="mt-1 h-9 w-9 shrink-0 opacity-60"
                                        style={{ color: PRIMARY }}
                                    />
                                </div>
                            </div>

                            <ul className="space-y-2.5 rounded-2xl border border-gray-100 bg-white p-4 text-sm">
                                <li className="flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-2 text-gray-600">
                                        <Droplets className="h-4 w-4 shrink-0" style={{ color: ACCENT_WARM }} />
                                        강수확률
                                    </span>
                                    <span className="font-semibold" style={{ color: ACCENT_WARM }}>
                                        {currentWeather.pop ?? "-"}%
                                    </span>
                                </li>
                                <li className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2.5">
                                    <span className="flex items-center gap-2 text-gray-600">
                                        <Wind className="h-4 w-4 shrink-0 text-cyan-600" />
                                        풍속
                                    </span>
                                    <span className="font-semibold text-gray-800">
                                        {currentWeather.wsd ?? "-"} m/s
                                    </span>
                                </li>
                                <li className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2.5">
                                    <span className="text-gray-600">습도</span>
                                    <span className="font-semibold text-gray-800">
                                        {currentWeather.reh ?? "-"}%
                                    </span>
                                </li>
                            </ul>
                        </div>
                        ) : (
                            <CurrentWeatherSkeleton />
                        )
                    )}

                    {mode === "hourly" && (
                        <div className="flex h-full min-h-[280px] flex-col">
                            <p
                                className="mb-1 truncate text-gray-500"
                                style={{ fontSize: "12px" }}
                            >
                                {locationName}
                            </p>
                            <h3 className="mb-3 text-sm font-semibold text-gray-700">
                                시간별 기온
                            </h3>
                            {hourlyChartData.length > 0 ? (
                                <div className="h-[240px] w-full min-w-0">
                                    <ResponsiveContainer width="100%" height={240} minWidth={0}>
                                        <ComposedChart data={hourlyChartData}>
                                            <defs>
                                                <linearGradient id="tempAreaFill" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.28} />
                                                    <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.03} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis
                                                dataKey="hourLabel"
                                                tick={{ fontSize: 11, fill: "#6b7280" }}
                                                interval="preserveStartEnd"
                                            />
                                            <YAxis
                                                tick={{ fontSize: 11, fill: "#6b7280" }}
                                                unit="°"
                                                domain={[hourlyYMin, "auto"]}
                                                width={36}
                                            />
                                            <Tooltip
                                                formatter={(v: number) => [`${v}°C`, "기온"]}
                                                labelFormatter={(label) => String(label)}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="temp"
                                                fill="url(#tempAreaFill)"
                                                stroke="none"
                                                isAnimationActive={false}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="temp"
                                                stroke={PRIMARY}
                                                strokeWidth={2.5}
                                                dot={{ r: 3, fill: PRIMARY }}
                                                activeDot={{ r: 5 }}
                                                isAnimationActive={false}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[240px] w-full animate-pulse rounded-xl bg-gray-50" />
                            )}
                        </div>
                    )}
                    </div>

                    {/* 하단: 단기예보 3일 */}
                    <div
                        className="mt-auto min-h-[226px] rounded-2xl border border-gray-100 bg-white p-4 pt-5"
                        style={{ boxShadow: CARD_SHADOW }}
                    >
                        <div className="mb-3 flex min-h-[20px] items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-gray-800">단기예보 (3일)</h3>
                            <span
                                className={`shrink-0 text-xs transition-opacity duration-200 ${loading ? "opacity-100" : "opacity-0"}`}
                                style={{ color: PRIMARY, minWidth: "3.5rem" }}
                                aria-hidden={!loading}
                            >
                                갱신 중...
                            </span>
                        </div>
                        <DailyForecastPanel
                            days={dailyForecast}
                            loading={loading}
                            compact
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Forecast;
