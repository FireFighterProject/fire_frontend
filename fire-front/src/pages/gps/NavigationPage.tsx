// src/pages/gps/NavigationPage.tsx

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/* --------------------------------------------
 * 전역 kakao 타입은 무조건 any 로 통일해야 함
 * -------------------------------------------- */
declare global {
    interface Window {
        kakao: any;
        routePolyline?: any;
    }
}

/* --------------------------------------------
 * Navigation용 Kakao 타입 정의
 * (전역 kakao 타입과 절대 충돌하지 않음)
 * -------------------------------------------- */
type NavigationKakaoMap = {
    setCenter(pos: any): void;
    setLevel(level: number): void;
    panTo(pos: any): void;
    setBounds(bounds: any): void;
};

type NavigationKakaoMarker = {
    setPosition(pos: any): void;
    setMap(map: any): void;
};

type NavigationKakaoPolyline = {
    setMap(map: any): void;
};

/* --------------------------------------------
 * OSRM 라우팅 타입
 * -------------------------------------------- */
type NavigationStep = {
    maneuver: { type: string; location: [number, number] };
    distance: number;
    duration: number;
};

type NavigationRoute = {
    geometry: { coordinates: number[][] };
    legs: { steps: NavigationStep[] }[];
};

/* --------------------------------------------
 * 컴포넌트 시작
 * -------------------------------------------- */
const NavigationPage = () => {
    const [params] = useSearchParams();

    const startLat = Number(params.get("startLat"));
    const startLon = Number(params.get("startLon"));
    const destAddress = params.get("dest") ?? "";

    const mapRef = useRef<HTMLDivElement | null>(null);

    // 🔥 kakao 타입 절대 쓰지 말고 NavigationKakao 사용!
    const markerRef = useRef<NavigationKakaoMarker | null>(null);
    const [map, setMap] = useState<NavigationKakaoMap | null>(null);

    /* --------------------------------------------
     * SDK 로딩
     * -------------------------------------------- */
    const loadKakao = useCallback((): Promise<void> => {
        return new Promise((resolve) => {
            if (window.kakao?.maps) return resolve();

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

    /* --------------------------------------------
     * 지도 초기화
     * -------------------------------------------- */
    useEffect(() => {
        (async () => {
            await loadKakao();
            if (!mapRef.current) return;

            const center = new window.kakao.maps.LatLng(startLat, startLon);

            const created = new window.kakao.maps.Map(mapRef.current, {
                center,
                level: 5,
            }) as NavigationKakaoMap;

            setMap(created);

            markerRef.current = new window.kakao.maps.Marker({
                map: created,
                position: center,
                zIndex: 5,
            }) as NavigationKakaoMarker;
        })();
    }, [loadKakao, startLat, startLon]);

    /* --------------------------------------------
     * 주소 → 좌표 변환
     * -------------------------------------------- */
    const geocode = useCallback((): Promise<{ lat: number; lon: number }> => {
        return new Promise((resolve, reject) => {
            const geocoder = new window.kakao.maps.services.Geocoder();

            geocoder.addressSearch(destAddress, (result: any[], status: string) => {
                if (status === window.kakao.maps.services.Status.OK) {
                    resolve({
                        lat: Number(result[0].y),
                        lon: Number(result[0].x),
                    });
                } else reject("주소 변환 실패");
            });
        });
    }, [destAddress]);

    /* --------------------------------------------
     * OSRM 경로 조회
     * -------------------------------------------- */
    const fetchRoute = useCallback(
        async (lat: number, lon: number): Promise<NavigationRoute> => {
            const res = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${lon},${lat}?overview=full&geometries=geojson&steps=true`
            );
            const data = await res.json();
            return data.routes[0] as NavigationRoute;
        },
        [startLat, startLon]
    );

    /* --------------------------------------------
     * 경로 그리기
     * -------------------------------------------- */
    const drawRoute = useCallback(
        (route: NavigationRoute) => {
            if (!map) return;

            const coords = route.geometry.coordinates.map(
                ([lon, lat]) => new window.kakao.maps.LatLng(lat, lon)
            );

            if (window.routePolyline) {
                window.routePolyline.setMap(null);
            }

            window.routePolyline = new window.kakao.maps.Polyline({
                map,
                path: coords,
                strokeWeight: 8,
                strokeColor: "#1E90FF",
                strokeOpacity: 0.9,
            }) as NavigationKakaoPolyline;

            const bounds = new window.kakao.maps.LatLngBounds();
            coords.forEach((p) => bounds.extend(p));

            map.setBounds(bounds);
        },
        [map]
    );

    /* --------------------------------------------
     * GPS 실시간 업데이트
     * -------------------------------------------- */
    useEffect(() => {
        if (!map || !markerRef.current) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const newPos = new window.kakao.maps.LatLng(latitude, longitude);

                markerRef.current!.setPosition(newPos);
                map.panTo(newPos);
            },
            () => console.warn("GPS 오류"),
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [map]);

    /* --------------------------------------------
     * 경로 계산 시작
     * -------------------------------------------- */
    useEffect(() => {
        if (!map) return;

        (async () => {
            try {
                const dest = await geocode();
                const route = await fetchRoute(dest.lat, dest.lon);
                drawRoute(route);
            } catch (err) {
                console.error(err);
            }
        })();
    }, [map, geocode, fetchRoute, drawRoute]);

    return <div ref={mapRef} className="w-full h-screen" />;
};

export default NavigationPage;
