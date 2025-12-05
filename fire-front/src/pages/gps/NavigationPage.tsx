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

    /* ===========================
     * 1) 카카오맵 로딩
     * =========================== */
    useEffect(() => {
        const load = () => {
            const kakao = window.kakao;

            if (!mapRef.current) return;

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
        };

        // SDK 로드
        window.kakao.maps.load(load);
    }, []);

    /* ===========================
     * 2) 주소 → 좌표 변환
     * =========================== */
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

    /* ===========================
     * 3) OSRM 경로 요청
     * =========================== */
    const requestRoute = async (destLat: number, destLon: number) => {
        const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${destLon},${destLat}?overview=full&geometries=geojson`;

        const res = await fetch(url);
        const data = await res.json();

        return data.routes[0].geometry.coordinates;
    };

    /* ===========================
     * 4) 경로 표시
     * =========================== */
    const drawRoute = (coords: any[]) => {
        if (!map) return;

        const kakao = window.kakao;

        const path = coords.map((c) => new kakao.maps.LatLng(c[1], c[0]));

        if (routeLine) {
            routeLine.setMap(null);
        }

        const polyline = new kakao.maps.Polyline({
            path,
            strokeWeight: 6,
            strokeColor: "#FF0000",
            strokeOpacity: 0.8,
        });

        polyline.setMap(map);
        setRouteLine(polyline);

        // 지도의 범위를 경로에 맞춤
        const bounds = new kakao.maps.LatLngBounds();
        path.forEach((p: any) => bounds.extend(p));
        map.setBounds(bounds);
    };

    /* ===========================
     * 5) 전체 네비 흐름 시작
     * =========================== */
    useEffect(() => {
        if (!map) return;

        (async () => {
            try {
                const dest = await geocodeAddress();
                const route = await requestRoute(dest.lat, dest.lon);
                drawRoute(route);
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
