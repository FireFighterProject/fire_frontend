// src/pages/NavigationPage.tsx

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

declare global {
    interface Window {
        kakao: any;
    }
}

const NavigationPage = () => {
    const [params] = useSearchParams();

    const startLat = Number(params.get("startLat"));
    const startLon = Number(params.get("startLon"));
    const destAddress = params.get("dest") ?? "";

    const mapRef = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<any>(null);
    const [routeLine, setRouteLine] = useState<any>(null);

    /** ================================
     *  0) 카카오 SDK 로드 함수
     * ================================= */
    const loadKakaoSDK = () => {
        return new Promise<void>((resolve) => {
            // 이미 로드되어 있다면 바로 resolve
            if (window.kakao && window.kakao.maps) {
                resolve();
                return;
            }

            const script = document.createElement("script");
            script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAOMAP_API_KEY
                }&libraries=services&autoload=false`;
            script.onload = () => {
                window.kakao.maps.load(() => resolve());
            };

            document.head.appendChild(script);
        });
    };

    /** ================================
     *  1) 지도 초기화
     * ================================= */
    useEffect(() => {
        async function initMap() {
            await loadKakaoSDK();

            if (!mapRef.current) return;

            const kakao = window.kakao;

            const center = new kakao.maps.LatLng(startLat, startLon);

            const mapObj = new kakao.maps.Map(mapRef.current, {
                center,
                level: 5,
            });

            setMap(mapObj);

            new kakao.maps.Marker({
                map: mapObj,
                position: center,
            });
        }

        initMap();
    }, []);

    /** ================================
     *  2) 주소 → 좌표 변환
     * ================================= */
    const geocodeAddress = () =>
        new Promise<{ lat: number; lon: number }>((resolve, reject) => {
            const geocoder = new window.kakao.maps.services.Geocoder();

            geocoder.addressSearch(destAddress, (result: any, status: string) => {
                if (status === window.kakao.maps.services.Status.OK) {
                    resolve({
                        lat: Number(result[0].y),
                        lon: Number(result[0].x),
                    });
                } else reject("주소 변환 실패");
            });
        });

    /** ================================
     *  3) OSRM 경로 요청
     * ================================= */
    const requestRoute = async (destLat: number, destLon: number) => {
        const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${destLon},${destLat}?overview=full&geometries=geojson`;

        const res = await fetch(url);
        const data = await res.json();

        return data.routes[0].geometry.coordinates;
    };

    /** ================================
     *  4) 경로 표시
     * ================================= */
    const drawRoute = (coords: any[]) => {
        if (!map) return;

        const kakao = window.kakao;

        const path = coords.map((c) => new kakao.maps.LatLng(c[1], c[0]));

        if (routeLine) routeLine.setMap(null);

        const polyline = new kakao.maps.Polyline({
            path,
            strokeWeight: 6,
            strokeColor: "#FF0000",
            strokeOpacity: 0.8,
        });

        polyline.setMap(map);
        setRouteLine(polyline);

        const bounds = new kakao.maps.LatLngBounds();
        path.forEach((p) => bounds.extend(p));
        map.setBounds(bounds);
    };

    /** ================================
     *  5) 경로 계산 전체 플로우
     * ================================= */
    useEffect(() => {
        if (!map) return;

        (async () => {
            try {
                const dest = await geocodeAddress();
                const routeCoords = await requestRoute(dest.lat, dest.lon);
                drawRoute(routeCoords);
            } catch (e) {
                alert("경로 계산 실패");
                console.error(e);
            }
        })();
    }, [map]);

    return (
        <div className="w-full h-screen">
            <div ref={mapRef} className="w-full h-full" />
        </div>
    );
};

export default NavigationPage;
