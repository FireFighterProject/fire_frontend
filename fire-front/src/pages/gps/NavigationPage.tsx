/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/gps/NavigationPage.tsx

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type {
    KakaoMarker,
    KakaoMap,
    KakaoPolyline,
} from "../../types/kakao-navigation";

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
 *  Tmap 경로 타입
 * =========================== */
type TmapRouteGeometry = {
    type: "LineString";
    coordinates: number[][]; // [ [lon, lat], ... ]
};

type TmapRouteFeature = {
    type: string;
    geometry?: {
        type: string;
        coordinates?: number[][];
    };
    properties?: any;
};

type TmapRouteResponse = {
    type: string; // "FeatureCollection"
    features?: TmapRouteFeature[];
};

const NavigationPage = () => {
    const [params] = useSearchParams();

    // ====== 출발지 좌표 (차량 현재 위치) ======
    const startLatParam = params.get("startLat");
    const startLonParam = params.get("startLon");
    const startLat = startLatParam ? Number(startLatParam) : null;
    const startLon = startLonParam ? Number(startLonParam) : null;

    // ====== 목적지 주소 (GPSReady 에서 넘어온 값) ======
    const destAddress = params.get("dest") ?? "";

    // ====== 목적지 좌표 (카카오 지오코딩 결과) ======
    const [destLat, setDestLat] = useState<number | null>(null);
    const [destLon, setDestLon] = useState<number | null>(null);

    const mapRef = useRef<HTMLDivElement | null>(null);
    const markerRef = useRef<KakaoMarker | null>(null);
    const routePolylineRef = useRef<KakaoPolyline | null>(null);

    const [map, setMap] = useState<KakaoMap | null>(null);

    /* ===========================
     * 1) 카카오맵 SDK 로더
     * =========================== */
    const loadKakao = useCallback((): Promise<void> => {
        return new Promise((resolve) => {
            // 이미 로드된 경우
            if (window.kakao?.maps) return resolve();

            // 이미 script가 붙어 있으면 재사용
            const existingScript = document.querySelector<HTMLScriptElement>(
                'script[data-kakao-maps-sdk="true"]'
            );
            if (existingScript) {
                existingScript.onload = () => window.kakao.maps.load(resolve);
                return;
            }

            // 새로 추가
            const script = document.createElement("script");
            script.dataset.kakaoMapsSdk = "true";
            script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAOMAP_API_KEY
                }&autoload=false&libraries=services`;
            script.onload = () => window.kakao.maps.load(resolve);
            document.head.appendChild(script);
        });
    }, []);

    /* ===========================
     * 2) 지도 생성 & 출발지 마커 표시
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
                level: 5,
            });

            setMap(created);

            markerRef.current = new window.kakao.maps.Marker({
                map: created,
                position: startPos,
            });
        })();
    }, [loadKakao, startLat, startLon]);

    /* ===========================
     * 3) 목적지 주소 → 좌표 변환 (지오코딩)
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
                } else {
                    console.error("지오코딩 실패:", status, result);
                    alert("목적지 주소를 좌표로 변환할 수 없습니다.");
                }
            }
        );
    }, [map, destAddress]);

    /* ===========================
     * 4) Tmap 경로 요청 (모든 LineString merge)
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

        // ✅ geometry.type === "LineString" 인 세그먼트 전부 합치기
        const lineFeatures =
            raw.features?.filter(
                (f) =>
                    f.geometry?.type === "LineString" &&
                    Array.isArray(f.geometry.coordinates)
            ) ?? [];

        console.log("LineString feature 개수:", lineFeatures.length);

        if (!lineFeatures.length) {
            throw new Error("TMAP LineString geometry 없음");
        }

        const mergedCoords: number[][] = [];

        lineFeatures.forEach((f, featureIdx) => {
            f.geometry!.coordinates!.forEach((coord, coordIdx) => {
                // 앞 세그먼트 마지막 점과 완전 같은 첫 점이면 중복 제거
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

        return {
            type: "LineString",
            coordinates: mergedCoords,
        };
    }, [startLat, startLon, destLat, destLon]);

    /* ===========================
     * 5) 경로 그리기 (카카오 Polyline)
     * =========================== */
    const drawRoute = useCallback(
        (geometry: TmapRouteGeometry) => {
            if (!map) return;

            const coords = geometry.coordinates.map(
                ([lon, lat]) => new window.kakao.maps.LatLng(lat, lon)
            );

            // 이전 Polyline 제거
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
        if (destLat == null || destLon == null) return; // 지오코딩 대기

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
     * 7) 언마운트 시 정리
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

    return <div ref={mapRef} className="w-full h-screen" />;
};

export default NavigationPage;
