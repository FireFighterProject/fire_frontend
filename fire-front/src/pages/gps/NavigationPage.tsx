/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/gps/NavigationPage.tsx

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { parseTmapRoute } from "../../services/map/tmapParser";
import useTTS from "../../hooks/useTTS";

/* Kakao는 무조건 any */
declare global {
    interface Window {
        kakao: any;
        routePolyline?: any;
    }
}

const NavigationPage = () => {
    const [params] = useSearchParams();

    const startLat = Number(params.get("startLat"));
    const startLon = Number(params.get("startLon"));
    const destLat = Number(params.get("destLat"));
    const destLon = Number(params.get("destLon"));

    const mapRef = useRef<HTMLDivElement | null>(null);
    const markerRef = useRef<any>(null);
    const [map, setMap] = useState<any>(null);

    const speak = useTTS();

    /* -------------------------
     * 1) Kakao SDK 로드
     * ------------------------- */
    const loadKakao = useCallback((): Promise<void> => {
        return new Promise((resolve) => {
            if (window.kakao?.maps) return resolve();

            const script = document.createElement("script");
            script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAOMAP_API_KEY
                }&autoload=false&libraries=services`;

            script.onload = () => window.kakao.maps.load(resolve);
            document.head.appendChild(script);
        });
    }, []);

    /* -------------------------
     * 2) 지도 생성
     * ------------------------- */
    useEffect(() => {
        (async () => {
            await loadKakao();
            if (!mapRef.current) return;

            const center = new window.kakao.maps.LatLng(startLat, startLon);

            const created = new window.kakao.maps.Map(mapRef.current, {
                center,
                level: 5,
            });

            setMap(created);

            markerRef.current = new window.kakao.maps.Marker({
                map: created,
                position: center,
                image: new window.kakao.maps.MarkerImage(
                    "/nav_arrow_blue.png",
                    new window.kakao.maps.Size(48, 48)
                ),
            });
        })();
    }, [loadKakao, startLat, startLon]);

    /* -------------------------
     * 3) TMAP 경로 요청
     * ------------------------- */
    const requestRoute = useCallback(async () => {
        const res = await fetch(
            "https://apis.openapi.sk.com/tmap/routes?version=1&format=json",
            {
                method: "POST",
                headers: {
                    appKey: import.meta.env.VITE_TMAP_API_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    startX: startLon,
                    startY: startLat,
                    endX: destLon,
                    endY: destLat,
                    reqCoordType: "WGS84GEO",
                    resCoordType: "WGS84GEO",
                    searchOption: "0",
                    trafficInfo: "Y",
                }),
            }
        );

        const data = await res.json();
        return data;
    }, [startLat, startLon, destLat, destLon]);

    /* -------------------------
     * 4) 경로 그리기
     * ------------------------- */
    const drawRoute = useCallback(
        (coords: any[]) => {
            if (!map) return;

            if (window.routePolyline) {
                window.routePolyline.setMap(null);
            }

            const polyline = new window.kakao.maps.Polyline({
                map,
                path: coords,
                strokeWeight: 8,
                strokeColor: "#007AFF",
                strokeOpacity: 0.9,
            });

            window.routePolyline = polyline;

            const bounds = new window.kakao.maps.LatLngBounds();
            coords.forEach((p) => bounds.extend(p));
            map.setBounds(bounds);
        },
        [map]
    );

    /* -------------------------
     * 5) GPS 실시간 추적
     * ------------------------- */
    useEffect(() => {
        if (!map || !markerRef.current) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;

                const newPos = new window.kakao.maps.LatLng(latitude, longitude);
                markerRef.current.setPosition(newPos);
                map.panTo(newPos);
            },
            console.warn,
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [map]);

    /* -------------------------
     * 6) 네비게이션 시작
     * ------------------------- */
    useEffect(() => {
        if (!map) return;

        (async () => {
            const raw = await requestRoute();
            const parsed = parseTmapRoute(raw);

            drawRoute(parsed.coords);

            // 첫 안내 음성
            if (parsed.instructions.length > 0) {
                speak(parsed.instructions[0].text);
            }
        })();
    }, [map, requestRoute, drawRoute, speak]);

    return (
        <div className="w-full h-screen relative">
            <div ref={mapRef} className="w-full h-full" />

            {/* ETA & 거리 표시 UI */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-xl text-sm">
                주행 중…
            </div>
        </div>
    );
};

export default NavigationPage;
