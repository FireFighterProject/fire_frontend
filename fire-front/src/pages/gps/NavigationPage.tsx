// src/pages/gps/NavigationPage.tsx

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

declare global {
    interface Window {
        kakao: typeof kakao;
        routePolyline?: kakao.maps.Polyline | null;
    }
}

type OSRMRoute = {
    geometry: {
        coordinates: number[][];
    };
    legs: OSRMLeg[];
};

type OSRMLeg = {
    steps: OSRMStep[];
};

type OSRMStep = {
    driving_side: string;
    maneuver: {
        type: string;
        location: [number, number];
    };
    name: string;
    duration: number;
    distance: number;
    geometry: {
        coordinates: number[][];
    };
};

const NavigationPage = () => {
    const [params] = useSearchParams();

    const startLat = Number(params.get("startLat"));
    const startLon = Number(params.get("startLon"));
    const destAddress = params.get("dest") ?? "";

    const mapRef = useRef<HTMLDivElement | null>(null);
    const markerRef = useRef<kakao.maps.Marker | null>(null);

    const [map, setMap] = useState<kakao.maps.Map | null>(null);

    /* ================================
     * SDK 로딩
     * ================================ */
    const loadKakao = useCallback((): Promise<void> => {
        return new Promise((resolve) => {
            if (window.kakao?.maps) resolve();

            const script = document.createElement("script");
            script.src =
                `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAOMAP_API_KEY
                }&autoload=false&libraries=services`;

            script.onload = () => {
                window.kakao.maps.load(() => resolve());
            };

            document.head.appendChild(script);
        });
    }, []);

    /* ================================
     * 지도 초기화
     * ================================ */
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

            // 차량 아이콘
            markerRef.current = new window.kakao.maps.Marker({
                map: created,
                position: center,
                zIndex: 5,
            });
        })();
    }, [loadKakao, startLat, startLon]);

    /* ================================
     * 주소 → 좌표
     * ================================ */
    const geocode = useCallback(
        (): Promise<{ lat: number; lon: number }> => {
            return new Promise((resolve, reject) => {
                const geocoder = new window.kakao.maps.services.Geocoder();

                geocoder.addressSearch(destAddress, (result, status) => {
                    if (status === window.kakao.maps.services.Status.OK) {
                        resolve({
                            lat: Number(result[0].y),
                            lon: Number(result[0].x),
                        });
                    } else reject("주소 변환 실패");
                });
            });
        },
        [destAddress]
    );

    /* ================================
     * OSRM 경로 요청
     * ================================ */
    const fetchRoute = useCallback(
        async (lat: number, lon: number): Promise<OSRMRoute> => {
            const res = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${lon},${lat}?overview=full&geometries=geojson&steps=true`
            );
            const data = await res.json();
            return data.routes[0];
        },
        [startLat, startLon]
    );

    /* ================================
     * 경로 표시
     * ================================ */
    const drawRoute = useCallback(
        (route: OSRMRoute) => {
            if (!map) return;

            const coords = route.geometry.coordinates.map(
                ([lon, lat]) => new window.kakao.maps.LatLng(lat, lon)
            );

            if (window.routePolyline) {
                window.routePolyline.setMap(null);
            }

            const polyline = new window.kakao.maps.Polyline({
                map,
                path: coords,
                strokeWeight: 8,
                strokeColor: "#1E90FF",
                strokeOpacity: 0.9,
            });

            window.routePolyline = polyline;

            const bounds = new window.kakao.maps.LatLngBounds();
            coords.forEach((p) => bounds.extend(p));
            map.setBounds(bounds);
        },
        [map]
    );

    /* ================================
     * GPS 실시간
     * ================================ */
    useEffect(() => {
        if (!map || !markerRef.current) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const newPos = new window.kakao.maps.LatLng(latitude, longitude);

                markerRef.current?.setPosition(newPos);
                map.panTo(newPos);
            },
            () => console.warn("GPS 오류"),
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [map]);

    /* ================================
     * 경로 계산 전체 실행
     * ================================ */
    useEffect(() => {
        if (!map) return;

        (async () => {
            try {
                const dest = await geocode();
                const route = await fetchRoute(dest.lat, dest.lon);
                drawRoute(route);
            } catch (err) {
                console.error(err);
                alert("경로 계산 실패");
            }
        })();
    }, [map, geocode, fetchRoute, drawRoute]);

    return <div ref={mapRef} className="w-full h-screen" />;
};

export default NavigationPage;
