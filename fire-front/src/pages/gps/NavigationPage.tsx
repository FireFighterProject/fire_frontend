/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/gps/NavigationPage.tsx

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/* --------------------------------------------
 * 전역 kakao 타입 any 유지
 * -------------------------------------------- */
declare global {
    interface Window {
        kakao: any;
        routePolyline?: any;
    }
}

/* --------------------------------------------
 * TMAP 응답 타입
 * -------------------------------------------- */
type TmapFeature = {
    geometry: { coordinates: number[][] };
    properties: {
        turnType?: number;
        description?: string;
        distance?: number;
        time?: number;
    };
};

type TmapRouteResponse = {
    type: string;
    features: TmapFeature[];
};

/* --------------------------------------------
 * NavigationPage
 * -------------------------------------------- */
const NavigationPage = () => {
    const [params] = useSearchParams();

    const startLat = Number(params.get("startLat"));
    const startLon = Number(params.get("startLon"));
    const destLat = Number(params.get("destLat"));
    const destLon = Number(params.get("destLon"));

    const mapRef = useRef<HTMLDivElement | null>(null);
    const markerRef = useRef<any>(null);
    const [map, setMap] = useState<any>(null);

    /* --------------------------------------------
     * Kakao Map SDK 로드
     * -------------------------------------------- */
    const loadKakao = useCallback((): Promise<void> => {
        return new Promise((resolve) => {
            if (window.kakao?.maps) return resolve();

            const script = document.createElement("script");
            script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAOMAP_API_KEY}&autoload=false&libraries=services`;
            script.onload = () => window.kakao.maps.load(resolve);

            document.head.appendChild(script);
        });
    }, []);

    /* --------------------------------------------
     * 지도 초기화
     * -------------------------------------------- */
    useEffect(() => {
        (async () => {
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
                zIndex: 5,
            });
        })();
    }, [loadKakao, startLat, startLon]);

    /* --------------------------------------------
     * TMAP 경로 요청
     * -------------------------------------------- */
    const requestTmapRoute = useCallback(async () => {
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
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            }
        );

        const data = (await res.json()) as TmapRouteResponse;

        if (!data.features) throw new Error("TMAP features 없음");

        return data.features;
    }, [startLat, startLon, destLat, destLon]);

    /* --------------------------------------------
     * 경로 그리기
     * -------------------------------------------- */
    const drawRoute = useCallback(
        (features: TmapFeature[]) => {
            if (!map) return;

            const coords: any[] = [];

            features.forEach((f) => {
                f.geometry.coordinates.forEach(([lon, lat]) => {
                    coords.push(new window.kakao.maps.LatLng(lat, lon));
                });
            });

            if (window.routePolyline) {
                window.routePolyline.setMap(null);
            }

            window.routePolyline = new window.kakao.maps.Polyline({
                map,
                path: coords,
                strokeWeight: 7,
                strokeColor: "#1E90FF",
                strokeOpacity: 0.9,
            });

            const bounds = new window.kakao.maps.LatLngBounds();
            coords.forEach((p) => bounds.extend(p));
            map.setBounds(bounds);
        },
        [map]
    );

    /* --------------------------------------------
     * GPS 실시간 반영
     * -------------------------------------------- */
    useEffect(() => {
        if (!map || !markerRef.current) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const p = new window.kakao.maps.LatLng(latitude, longitude);

                markerRef.current.setPosition(p);
                map.panTo(p);
            },
            () => console.warn("GPS 오류"),
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [map]);

    /* --------------------------------------------
     * 네비게이션 시작
     * -------------------------------------------- */
    useEffect(() => {
        if (!map) return;

        (async () => {
            try {
                const features = await requestTmapRoute();
                drawRoute(features);
            } catch (err) {
                console.error(err);
                alert("경로 생성 실패");
            }
        })();
    }, [map, requestTmapRoute, drawRoute]);

    return <div ref={mapRef} className="w-full h-screen" />;
};

export default NavigationPage;
