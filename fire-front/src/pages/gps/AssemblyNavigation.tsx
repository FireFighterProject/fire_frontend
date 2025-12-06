/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import apiClient from "../../api/axios";
import type { KakaoMap, KakaoMarker } from "../../types/kakao-navigation";

declare global {
    interface Window {
        kakao: any;
    }
}

/* ===========================
 *  공통 유틸
 * =========================== */
const toRad = (v: number) => (v * Math.PI) / 180;

const haversineMeters = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
) => {
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const formatDistance = (m: number) => {
    if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
    return `${Math.round(m)} m`;
};

const formatTime = (sec: number) => {
    const total = Math.round(sec);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);

    if (h > 0) return `${h}시간 ${m}분`;
    if (m > 0) return `${m}분`;
    return "1분 미만";
};

const AssemblyNavigationPage = () => {
    const [params] = useSearchParams();

    // 문자 링크로부터 차량 ID + 자원집결지 주소
    const vehicleParam = params.get("vehicleId");
    const vehicleId = vehicleParam ? Number(vehicleParam) : null;
    const rallyAddress = params.get("address") ?? "";

    // 지도 관련
    const mapRef = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<KakaoMap | null>(null);
    const meMarkerRef = useRef<KakaoMarker | null>(null);
    const rallyMarkerRef = useRef<KakaoMarker | null>(null);

    // 좌표 상태
    const [currentLat, setCurrentLat] = useState<number | null>(null);
    const [currentLon, setCurrentLon] = useState<number | null>(null);
    const [destLat, setDestLat] = useState<number | null>(null);
    const [destLon, setDestLon] = useState<number | null>(null);

    // 상태 표시
    const [error, setError] = useState<string>("");
    const [accepted, setAccepted] = useState(false); // 응소 OK 여부

    // 하단 상태바
    const [remainingDistanceM, setRemainingDistanceM] = useState<number | null>(
        null
    );
    const [remainingTimeSec, setRemainingTimeSec] = useState<number | null>(
        null
    );
    const [currentSpeedKph, setCurrentSpeedKph] = useState<number | null>(null);

    // 속도 계산 + 서버 전송용
    const lastPosRef = useRef<{ lat: number; lon: number; t: number } | null>(
        null
    );
    const latestPosRef = useRef<{ lat: number; lon: number } | null>(null);

    /* ===========================
     *  카카오맵 SDK 로딩
     * =========================== */
    const loadKakao = useCallback((): Promise<void> => {
        return new Promise((resolve) => {
            if (window.kakao?.maps) return resolve();

            const existingScript = document.querySelector<HTMLScriptElement>(
                'script[data-kakao-maps-sdk="true"]'
            );
            if (existingScript) {
                existingScript.onload = () => window.kakao.maps.load(resolve);
                return;
            }

            const script = document.createElement("script");
            script.dataset.kakaoMapsSdk = "true";
            script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAOMAP_API_KEY
                }&autoload=false&libraries=services`;
            script.onload = () => window.kakao.maps.load(resolve);
            document.head.appendChild(script);
        });
    }, []);

    /* ===========================
     *  지도 생성
     * =========================== */
    useEffect(() => {
        (async () => {
            await loadKakao();
            if (!mapRef.current) return;

            const center = new window.kakao.maps.LatLng(37.5665, 126.9780); // 기본: 서울 시청
            const created = new window.kakao.maps.Map(mapRef.current, {
                center,
                level: 7,
            });
            setMap(created);
        })();
    }, [loadKakao]);

    /* ===========================
     *  자원집결지 주소 → 좌표 변환
     * =========================== */
    useEffect(() => {
        if (!map) return;
        if (!rallyAddress) return;

        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(
            rallyAddress,
            (result: any[], status: string) => {
                if (
                    status === window.kakao.maps.services.Status.OK &&
                    result[0]
                ) {
                    const y = parseFloat(result[0].y); // lat
                    const x = parseFloat(result[0].x); // lon
                    setDestLat(y);
                    setDestLon(x);

                    const pos = new window.kakao.maps.LatLng(y, x);

                    if (!rallyMarkerRef.current) {
                        rallyMarkerRef.current =
                            new window.kakao.maps.Marker({
                                map,
                                position: pos,
                            });
                    } else {
                        rallyMarkerRef.current.setPosition(pos);
                    }

                    // 목적지 기준으로 1회 센터 조정
                    map.setCenter(pos);
                } else {
                    console.error("자원집결지 지오코딩 실패:", status, result);
                    setError("자원집결지 주소를 찾을 수 없습니다.");
                }
            }
        );
    }, [map, rallyAddress]);

    /* ===========================
     *  현재 위치 추적 (watchPosition)
     * =========================== */
    useEffect(() => {
        if (!map) return;

        if (!("geolocation" in navigator)) {
            setError("이 기기에서 위치 정보를 사용할 수 없습니다.");
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setCurrentLat(latitude);
                setCurrentLon(longitude);
                latestPosRef.current = { lat: latitude, lon: longitude };
                setError("");

                const mePos = new window.kakao.maps.LatLng(
                    latitude,
                    longitude
                );

                // 나(marker) 표시
                if (!meMarkerRef.current) {
                    meMarkerRef.current = new window.kakao.maps.Marker({
                        map,
                        position: mePos,
                    });
                } else {
                    meMarkerRef.current.setPosition(mePos);
                }

                // 처음엔 내 위치 기준으로도 한번 센터 조정
                if (!destLat || !destLon) {
                    map.setCenter(mePos);
                }

                // 속도 계산
                const now = Date.now();
                if (lastPosRef.current) {
                    const dtSec = (now - lastPosRef.current.t) / 1000;
                    if (dtSec > 1) {
                        const distM = haversineMeters(
                            lastPosRef.current.lat,
                            lastPosRef.current.lon,
                            latitude,
                            longitude
                        );
                        const speed = (distM / dtSec) * 3.6; // m/s → km/h
                        if (!Number.isNaN(speed) && speed < 200) {
                            setCurrentSpeedKph(speed);
                        }
                    }
                }
                lastPosRef.current = { lat: latitude, lon: longitude, t: now };

                // 자원집결지까지 남은 거리 / 예상 시간
                if (destLat != null && destLon != null) {
                    const d = haversineMeters(
                        latitude,
                        longitude,
                        destLat,
                        destLon
                    );
                    setRemainingDistanceM(d);

                    // 현재 속도가 있으면 그걸로 ETA 추정, 없으면 대략 40km/h 가정
                    const speedKph =
                        currentSpeedKph && currentSpeedKph > 5
                            ? currentSpeedKph
                            : 40;
                    const speedMps = (speedKph * 1000) / 3600;
                    if (speedMps > 0) {
                        setRemainingTimeSec(d / speedMps);
                    } else {
                        setRemainingTimeSec(null);
                    }
                }
            },
            (err) => {
                console.error("GPS 오류", err);
                setError("GPS 위치를 가져올 수 없습니다. 권한을 확인해 주세요.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [map, destLat, destLon, currentSpeedKph]);

    /* ===========================
     *  응소 OK 이후 주기적인 GPS 전송
     * =========================== */
    useEffect(() => {
        if (!accepted) return;
        if (!vehicleId) return;

        let cancelled = false;

        const intervalId = window.setInterval(async () => {
            if (!latestPosRef.current) return;

            const { lat, lon } = latestPosRef.current;
            const payload = {
                vehicleId,
                latitude: lat,
                longitude: lon,
            };

            try {
                console.log("📡 /gps/send 주기적 전송", payload);
                await apiClient.post("/gps/send", payload);
            } catch (err) {
                if (!cancelled) {
                    console.error("🚨 /gps/send 전송 실패", err);
                }
            }
        }, 5000); // 5초마다 전송

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [accepted, vehicleId]);

    /* ===========================
     *  응소 OK 버튼
     * =========================== */
    const handleAccept = async () => {
        if (!vehicleId) {
            alert(
                "차량 정보가 없습니다.\n문자에 포함된 링크를 다시 열어주세요."
            );
            return;
        }
        if (currentLat == null || currentLon == null) {
            alert("현재 위치를 불러오는 중입니다.\n잠시 후 다시 시도해 주세요.");
            return;
        }

        setAccepted(true);

        // 최초 1회 즉시 전송
        const payload = {
            vehicleId,
            latitude: currentLat,
            longitude: currentLon,
        };

        try {
            console.log("📡 /gps/send 최초 전송", payload);
            await apiClient.post("/gps/send", payload);
            alert("응소 OK 처리 완료!\n현재 위치가 관제센터로 전송됩니다.");
        } catch (err) {
            console.error("🚨 /gps/send 최초 전송 실패", err);
            alert(
                "응소는 처리했지만 위치 전송에 실패했습니다.\n네트워크 상태를 확인해 주세요."
            );
        }
    };

    /* ===========================
     *  위치 공유 종료
     * =========================== */
    const handleStop = () => {
        const ok = window.confirm(
            "위치 공유를 종료하시겠습니까?\n이후에는 관제센터에서 현재 위치를 볼 수 없습니다."
        );
        if (!ok) return;
        setAccepted(false);
        alert("위치 공유가 종료되었습니다.");
    };

    return (
        <>
            {/* 전체 지도 */}
            <div ref={mapRef} className="w-full h-screen" />

            {/* 🔹 상단 상태 표시 */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]">
                <div className="bg-black/75 text-white px-4 py-3 rounded-2xl shadow-lg flex flex-col items-center min-w-[220px]">
                    <span className="text-xs text-gray-300 mb-1">
                        현재 상태
                    </span>
                    <span className="text-sm font-semibold">
                        {accepted ? "응소 완료 · 위치 전송 중" : "응소 대기 중"}
                    </span>
                    {error && (
                        <span className="mt-1 text-[11px] text-red-300 text-center">
                            {error}
                        </span>
                    )}
                </div>
            </div>

            {/* 🔹 자원집결지 정보 카드 (좌측) */}
            {rallyAddress && (
                <div className="fixed top-24 left-4 z-[9998] max-w-xs">
                    <div className="bg-white/95 text-gray-900 rounded-2xl shadow-lg p-4 space-y-2">
                        <div className="text-sm font-semibold text-gray-500">
                            자원집결지
                        </div>
                        <div className="text-base font-bold leading-snug">
                            {rallyAddress}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">
                            응소 OK 이후 현재 위치가 관제센터로 전송됩니다.
                        </div>
                    </div>
                </div>
            )}

            {/* 🔹 하단 상태바: 거리 / 시간 / 속도 */}
            {(remainingDistanceM != null ||
                remainingTimeSec != null ||
                currentSpeedKph != null) && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
                        <div className="bg-black/80 text-white px-6 py-3 rounded-3xl shadow-xl flex gap-8 pointer-events-none">
                            {remainingDistanceM != null && (
                                <div className="flex flex-col items-center min-w-[90px]">
                                    <span className="text-[11px] text-gray-300">
                                        남은 거리
                                    </span>
                                    <span className="text-xl font-semibold">
                                        {formatDistance(remainingDistanceM)}
                                    </span>
                                </div>
                            )}

                            {remainingTimeSec != null && (
                                <div className="flex flex-col items-center min-w-[90px]">
                                    <span className="text-[11px] text-gray-300">
                                        예상 시간
                                    </span>
                                    <span className="text-xl font-semibold">
                                        {formatTime(remainingTimeSec)}
                                    </span>
                                </div>
                            )}

                            {currentSpeedKph != null && (
                                <div className="flex flex-col items-center min-w-[90px]">
                                    <span className="text-[11px] text-gray-300">
                                        현재 속도
                                    </span>
                                    <span className="text-xl font-semibold">
                                        {Math.round(currentSpeedKph)} km/h
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            {/* 🔴 응소 OK 버튼 */}
            <button
                type="button"
                onClick={handleAccept}
                disabled={accepted}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[10000] bg-red-600 text-white px-6 py-3 rounded-full shadow-xl text-lg font-bold active:scale-95 disabled:opacity-60"
            >
                {accepted ? "응소 완료 · 위치 전송 중" : "응소 OK (자원집결 시작)"}
            </button>

            {/* ⚪ 위치 공유 종료 버튼 */}
            {accepted && (
                <button
                    type="button"
                    onClick={handleStop}
                    className="fixed bottom-24 right-4 z-[10000] bg-white text-gray-900 px-4 py-2 rounded-full shadow-md text-sm font-semibold active:scale-95"
                >
                    위치 공유 종료
                </button>
            )}
        </>
    );
};

export default AssemblyNavigationPage;
