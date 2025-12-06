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
        // 카카오 스크립트 중복 로드 방지용 커스텀 data 속성
        querySelector<E extends Element = Element>(
            selectors: string
        ): E | null;
    }
}

/* ===========================
 *  Tmap 경로 타입
 * =========================== */
type TmapRouteGeometry = {
    type: string; // 보통 "LineString"
    coordinates: number[][]; // [ [lon, lat], [lon, lat], ... ]
};

type TmapRouteFeature = {
    type: string;
    geometry: TmapRouteGeometry;
    properties: any;
};

type TmapRouteResponse = {
    type: string; // "FeatureCollection"
    features: TmapRouteFeature[];
};

const NavigationPage = () => {
    const [params] = useSearchParams();

    // ====== 쿼리 파라미터 처리 (NaN 방어 포함) ======
    const startLatParam = params.get("startLat");
    const startLonParam = params.get("startLon");
    const destLatParam = params.get("destLat");
    const destLonParam = params.get("destLon");

    const startLat = startLatParam ? Number(startLatParam) : null;
    const startLon = startLonParam ? Number(startLonParam) : null;
    const destLat = destLatParam ? Number(destLatParam) : null;
    const destLon = destLonParam ? Number(destLonParam) : null;

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

            // 이미 script가 붙어 있는 경우 (중복 로드 방지)
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
            // 좌표가 하나라도 없으면 종료
            if (
                startLat == null ||
                startLon == null ||
                destLat == null ||
                destLon == null
            ) {
                alert("좌표 정보가 잘못되었습니다.");
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
    }, [loadKakao, startLat, startLon, destLat, destLon]);

    /* ===========================
     * 3) Tmap 경로 요청
     * =========================== */
    const requestTmapRoute = useCallback(async (): Promise<TmapRouteGeometry> => {
        if (
            startLat == null ||
            startLon == null ||
            destLat == null ||
            destLon == null
        ) {
            throw new Error("좌표 정보가 없습니다.");
        }

        const body = {
            startX: startLon.toString(),
            startY: startLat.toString(),
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

        // LineString geometry 찾기
        const lineFeature = raw.features?.find(
            (f) => f.geometry?.type === "LineString"
        );

        if (!lineFeature?.geometry?.coordinates) {
            throw new Error("TMAP geometry.coordinates 없음 (LineString 없음)");
        }

        return lineFeature.geometry;
    }, [startLat, startLon, destLat, destLon]);

    /* ===========================
     * 4) 경로 그리기 (카카오 Polyline)
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

            // 경로 전체가 보이도록 Bounds 조정
            const bounds = new window.kakao.maps.LatLngBounds();
            coords.forEach((p) => bounds.extend(p));

            map.setBounds(bounds);
        },
        [map]
    );

    /* ===========================
     * 5) 지도 준비 후 Tmap 경로 요청 + 그리기
     * =========================== */
    useEffect(() => {
        if (!map) return;

        (async () => {
            try {
                const geometry = await requestTmapRoute();
                drawRoute(geometry);
            } catch (err) {
                console.error(err);
                alert("경로 생성에 실패했습니다. (자동차 경로 API 구조를 확인해주세요)");
            }
        })();
    }, [map, requestTmapRoute, drawRoute]);

    /* ===========================
     * 6) 언마운트 시 정리
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
