/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/gps/NavigationPage.tsx

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type {
    KakaoMarker,
    KakaoMap,
    KakaoPolyline,
} from "../../types/kakao-navigation";
import api from "../../api/axios";

declare global {
    interface Window {
        kakao: any;
    }

    interface Document {
        querySelector<E extends Element = Element>(
            selectors: string
        ): E | null;
    }
}

/* ===========================
 *  Tmap 경로 타입 + 안내정보 타입
 * =========================== */
type TmapRouteGeometry = {
    type: "LineString";
    coordinates: number[][]; // [ [lon, lat], ... ]
};

type TmapRouteFeature = {
    type: string;
    geometry?: {
        type: string;
        coordinates?: number[];        // Point
        traffic?: any[];
    } | {
        type: string;
        coordinates?: number[][];
        traffic?: any[];
    };
    properties?: {
        description?: string;
        distance?: number;
        time?: number;
        turnType?: number;
        nextRoadName?: string;
        index?: number;
        pointIndex?: number;
        pointType?: string;
        name?: string;
        [key: string]: any;
    };
};

type TmapRouteResponse = {
    type: string; // "FeatureCollection"
    features?: TmapRouteFeature[];
};

/** 안내용 타입 */
type NavInstruction = {
    order: number;
    description: string;
    turnType?: number;
    nextRoadName?: string;
    point: { lat: number; lon: number };
};

/* ===========================
 *  유틸: 방향 화살표 / 거리계산
 * =========================== */
const getDirectionSymbol = (desc: string, turnType?: number) => {
    if (desc.includes("좌회전")) return "⬅️";
    if (desc.includes("우회전")) return "➡️";
    if (desc.includes("유턴")) return "↩️";

    // Use turnType for additional direction symbols
    if (turnType === 1) return "⬆️"; // Straight
    if (turnType === 2) return "↗️"; // Slight right
    if (turnType === 3) return "↘️"; // Right
    if (turnType === 4) return "↙️"; // Slight left
    if (turnType === 5) return "↖️"; // Left

    return "⬆️";
};

const toRad = (v: number) => (v * Math.PI) / 180;
const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

/* ===========================
 *  Web Speech API (TTS)
 * =========================== */
const speakKorean = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!text) return;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ko-KR";
    utter.rate = 1.0;
    utter.pitch = 1.0;
    window.speechSynthesis.speak(utter);
};

const NavigationPage = () => {
    const [params] = useSearchParams();

    // ====== 차량 ID (실시간 GPS 조회용) ======
    const vehicleParam = params.get("vehicle");
    const vehicleId = vehicleParam ? Number(vehicleParam) : null;

    // ====== 출발지 좌표 (최초 GPS) ======
    const startLatParam = params.get("startLat");
    const startLonParam = params.get("startLon");
    const startLat = startLatParam ? Number(startLatParam) : null;
    const startLon = startLonParam ? Number(startLonParam) : null;

    // ====== 목적지 주소 ======
    const destAddress = params.get("dest") ?? "";

    // ====== 목적지 좌표 ======
    const [destLat, setDestLat] = useState<number | null>(null);
    const [destLon, setDestLon] = useState<number | null>(null);

    const mapRef = useRef<HTMLDivElement | null>(null);
    const markerRef = useRef<KakaoMarker | null>(null);
    const routePolylineRef = useRef<KakaoPolyline | null>(null);

    const [map, setMap] = useState<KakaoMap | null>(null);

    // 🧭 안내문 리스트 + 현재 안내 인덱스
    const [instructions, setInstructions] = useState<NavInstruction[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const lastSpokenIdxRef = useRef<number | null>(null);

    /* ===========================
     * 1) 카카오맵 SDK 로더
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
     * 2) 지도 생성 & 출발지 마커
     * =========================== */
    useEffect(() => {
        (async () => {
            if (startLat == null || startLon == null) {
                alert("출발지 좌표 정보가 잘못되었습니다.");
                return;
            }

            await loadKakao();
            if (!mapRef.current) return;

            const startPos = new window.kakao.maps.LatLng(startLat, startLon);

            const created = new window.kakao.maps.Map(mapRef.current, {
                center: startPos,
                level: 7,
            });

            setMap(created);

            markerRef.current = new window.kakao.maps.Marker({
                map: created,
                position: startPos,
            });
        })();
    }, [loadKakao, startLat, startLon]);

    /* ===========================
     * 3) 목적지 지오코딩 + 마커
     * =========================== */
    useEffect(() => {
        if (!map) return;
        if (!destAddress) {
            alert("목적지 주소가 없습니다.");
            return;
        }

        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(
            destAddress,
            (result: any[], status: string) => {
                if (
                    status === window.kakao.maps.services.Status.OK &&
                    result[0]
                ) {
                    const y = parseFloat(result[0].y); // 위도
                    const x = parseFloat(result[0].x); // 경도
                    setDestLat(y);
                    setDestLon(x);
                    console.log("DEST GEOCODE:", destAddress, y, x);

                    const destPos = new window.kakao.maps.LatLng(y, x);
                    new window.kakao.maps.Marker({
                        map,
                        position: destPos,
                    });
                } else {
                    console.error("지오코딩 실패:", status, result);
                    alert("목적지 주소를 좌표로 변환할 수 없습니다.");
                }
            }
        );
    }, [map, destAddress]);

    /* ===========================
     * 4) Tmap 경로 요청 + 안내문 추출
     * =========================== */
    const requestTmapRoute = useCallback(async (): Promise<TmapRouteGeometry> => {
        if (
            startLat == null ||
            startLon == null ||
            destLat == null ||
            destLon == null
        ) {
            throw new Error("출발/도착 좌표 정보가 없습니다.");
        }

        const body = {
            startX: startLon.toString(), // 경도
            startY: startLat.toString(), // 위도
            endX: destLon.toString(),
            endY: destLat.toString(),
            reqCoordType: "WGS84GEO",
            resCoordType: "WGS84GEO",
            searchOption: "0",
            trafficInfo: "Y",
        };

        const res = await fetch(
            "https://apis.openapi.sk.com/tmap/routes?version=1&format=json",
            {
                method: "POST",
                headers: {
                    appKey: import.meta.env.VITE_TMAP_API_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            }
        );

        if (!res.ok) {
            const text = await res.text();
            console.error("TMAP ERROR:", res.status, text);
            throw new Error(`TMAP 요청 실패: ${res.status}`);
        }

        const raw = (await res.json()) as TmapRouteResponse;
        console.log("RAW TMAP RESPONSE:", raw);

        const features = raw.features ?? [];

        // 1) Polyline 데이터 (LineString)
        const lineFeatures =
            features.filter(
                (f) =>
                    f.geometry?.type === "LineString" &&
                    Array.isArray((f.geometry as any).coordinates)
            ) ?? [];

        if (!lineFeatures.length) {
            throw new Error("TMAP LineString geometry 없음");
        }

        const mergedCoords: number[][] = [];

        lineFeatures.forEach((f, featureIdx) => {
            const coords = (f.geometry as any).coordinates as number[][];
            coords.forEach((coord, coordIdx) => {
                if (
                    featureIdx > 0 &&
                    coordIdx === 0 &&
                    mergedCoords.length &&
                    mergedCoords[mergedCoords.length - 1][0] === coord[0] &&
                    mergedCoords[mergedCoords.length - 1][1] === coord[1]
                ) {
                    return;
                }
                mergedCoords.push(coord);
            });
        });

        console.log(
            "Tmap merged total points:",
            mergedCoords.length,
            "첫 5개 좌표:",
            mergedCoords.slice(0, 5)
        );

        // 2) 안내용 포인트 (Point + description 있는 것만)
        const pointInstructions: NavInstruction[] = features
            .filter(
                (f) =>
                    f.geometry?.type === "Point" &&
                    Array.isArray((f.geometry as any).coordinates) &&
                    f.properties?.description
            )
            .map((f, idx) => {
                const coords = (f.geometry as any).coordinates as number[];
                const props = f.properties!;
                const [lon, lat] = coords;

                const order =
                    typeof props.pointIndex === "number"
                        ? props.pointIndex
                        : typeof props.index === "number"
                            ? props.index
                            : idx;

                return {
                    order,
                    description: props.description ?? "",
                    turnType: props.turnType,
                    nextRoadName: props.nextRoadName,
                    point: { lat, lon },
                };
            })
            .sort((a, b) => a.order - b.order);

        console.log("Nav instructions:", pointInstructions);

        setInstructions(pointInstructions);
        setCurrentIdx(0);
        lastSpokenIdxRef.current = null;

        // 첫 안내문 TTS
        if (pointInstructions[0]) {
            speakKorean(pointInstructions[0].description);
            lastSpokenIdxRef.current = pointInstructions[0].order;
        }

        return {
            type: "LineString",
            coordinates: mergedCoords,
        };
    }, [startLat, startLon, destLat, destLon]);

    /* ===========================
     * 5) 경로 그리기
     * =========================== */
    const drawRoute = useCallback(
        (geometry: TmapRouteGeometry) => {
            if (!map) return;

            const coords = geometry.coordinates.map(
                ([lon, lat]) => new window.kakao.maps.LatLng(lat, lon)
            );

            if (routePolylineRef.current) {
                routePolylineRef.current.setMap(null);
            }

            const poly = new window.kakao.maps.Polyline({
                map,
                path: coords,
                strokeWeight: 7,
                strokeColor: "#1E90FF",
            });

            routePolylineRef.current = poly;

            const bounds = new window.kakao.maps.LatLngBounds();
            coords.forEach((p) => bounds.extend(p));
            map.setBounds(bounds);
        },
        [map]
    );

    /* ===========================
     * 6) 지도 + 목적지 좌표 준비되면 Tmap 경로 그리기
     * =========================== */
    useEffect(() => {
        if (!map) return;
        if (destLat == null || destLon == null) return;

        (async () => {
            try {
                const geometry = await requestTmapRoute();
                drawRoute(geometry);
            } catch (err) {
                console.error(err);
                alert("경로 생성에 실패했습니다. (Tmap 응답 구조를 확인해주세요)");
            }
        })();
    }, [map, destLat, destLon, requestTmapRoute, drawRoute]);

    /* ===========================
     * 7) 현재 GPS 기준으로 다음 안내문 갱신
     * =========================== */
    const updateInstructionForPosition = useCallback(
        (lat: number, lon: number) => {
            if (!instructions.length) return;

            const THRESHOLD = 80; // m 이내면 해당 안내 발동

            // 현재 인덱스 이후에서 "가장 가까운 포인트" 찾기
            for (let i = currentIdx; i < instructions.length; i++) {
                const ins = instructions[i];
                const d = haversineMeters(
                    lat,
                    lon,
                    ins.point.lat,
                    ins.point.lon
                );

                if (d < THRESHOLD) {
                    if (i !== currentIdx) {
                        setCurrentIdx(i);
                    }
                    // TTS는 별도 effect에서 처리
                    break;
                }
            }
        },
        [instructions, currentIdx]
    );

    /* ===========================
     * 8) 실시간 GPS 폴링 (차량 기준 화면 이동)
     * =========================== */
    useEffect(() => {
        if (!map) return;
        if (!vehicleId) return;
        if (!markerRef.current) return;

        let cancelled = false;

        const intervalId = window.setInterval(async () => {
            try {
                const res = await api.get(`/gps/location/${vehicleId}`);
                console.log("GPS LOCATION RES:", res.data);

                // ⚠️ 실제 응답 구조에 맞게 필드명 조정 필요
                const { latitude, longitude } = res.data;

                if (cancelled || !markerRef.current) return;

                const pos = new window.kakao.maps.LatLng(
                    latitude,
                    longitude
                );

                // 마커 이동 + 차량 기준 화면 이동
                markerRef.current.setPosition(pos);
                map.panTo(pos);

                updateInstructionForPosition(latitude, longitude);
            } catch (e) {
                console.error("실시간 GPS 조회 실패", e);
            }
        }, 3000); // 3초마다 요청

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [map, vehicleId, updateInstructionForPosition]);

    /* ===========================
     * 9) 안내문 바뀔 때마다 TTS 실행
     * =========================== */
    useEffect(() => {
        if (!instructions.length) return;
        const ins = instructions[currentIdx];
        if (!ins) return;

        // 같은 order는 한 번만 읽기
        if (lastSpokenIdxRef.current === ins.order) return;

        speakKorean(ins.description);
        lastSpokenIdxRef.current = ins.order;
    }, [currentIdx, instructions]);

    /* ===========================
     * 10) 언마운트 정리
     * =========================== */
    useEffect(() => {
        return () => {
            if (routePolylineRef.current) {
                routePolylineRef.current.setMap(null);
            }
            if (markerRef.current) {
                markerRef.current.setMap(null);
            }
        };
    }, []);

    const currentInstruction = instructions[currentIdx];

    return (
        <>
            {/* 전체 화면 지도 */}
            <div ref={mapRef} className="w-full h-screen" />

            {/* 🧭 상단 고정 안내 박스 (항상 보이게) */}
            {currentInstruction && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]">
                    <div className="bg-black/70 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 max-w-xl pointer-events-none">
                        <span className="text-3xl">
                            {getDirectionSymbol(
                                currentInstruction.description,
                                currentInstruction.turnType
                            )}
                        </span>
                        <div className="flex flex-col">
                            <span className="font-semibold text-lg">
                                {currentInstruction.description}
                            </span>
                            {currentInstruction.nextRoadName && (
                                <span className="text-sm text-gray-200">
                                    다음 도로: {currentInstruction.nextRoadName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );

};

export default NavigationPage;
