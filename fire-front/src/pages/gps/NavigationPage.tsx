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
    const markerRef = useRef<any>(null);

    const [map, setMap] = useState<any>(null);
    const [routeLine, setRouteLine] = useState<any>(null);

    const [nextInstruction, setNextInstruction] = useState<string>("경로 계산 중...");
    const [remainDist, setRemainDist] = useState<number>(0);

    /** 0) 카카오 지도 SDK 로드 */
    const loadKakaoSDK = () =>
        new Promise<void>((resolve) => {
            if (window.kakao?.maps) return resolve();

            const script = document.createElement("script");
            script.src =
                `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${import.meta.env.VITE_KAKAOMAP_API_KEY}&libraries=services`;
            script.onload = () => window.kakao.maps.load(() => resolve());
            document.head.appendChild(script);
        });

    /** 1) 지도 초기화 */
    useEffect(() => {
        (async () => {
            await loadKakaoSDK();
            if (!mapRef.current) return;

            const kakao = window.kakao;

            const m = new kakao.maps.Map(mapRef.current, {
                center: new kakao.maps.LatLng(startLat, startLon),
                level: 4,
            });

            setMap(m);

            const icon = new kakao.maps.MarkerImage(
                "https://cdn-icons-png.flaticon.com/512/684/684908.png",
                new kakao.maps.Size(42, 42),
                { offset: new kakao.maps.Point(21, 21) }
            );

            markerRef.current = new kakao.maps.Marker({
                map: m,
                position: new kakao.maps.LatLng(startLat, startLon),
                image: icon,
            });
        })();
    }, []);

    /** 2) 주소 → 좌표 변환 */
    const geocodeAddress = () =>
        new Promise<{ lat: number; lon: number }>((resolve, reject) => {
            const geocoder = new window.kakao.maps.services.Geocoder();

            geocoder.addressSearch(destAddress, (result: any, status: string) => {
                if (status === window.kakao.maps.services.Status.OK)
                    resolve({
                        lat: Number(result[0].y),
                        lon: Number(result[0].x),
                    });
                else reject("주소 변환 실패");
            });
        });

    /** 3) OSRM 경로 요청 */
    const loadRoute = async (destLat: number, destLon: number) => {
        const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${destLon},${destLat}?overview=full&steps=true&geometries=geojson`;

        const res = await fetch(url);
        const data = await res.json();

        return data.routes[0];
    };

    /** 4) 경로 화면 표시 */
    const drawRoute = (geometry: any) => {
        if (!map) return;

        const kakao = window.kakao;

        const path = geometry.coordinates.map(
            (c: any) => new kakao.maps.LatLng(c[1], c[0])
        );

        if (routeLine) routeLine.setMap(null);

        const line = new kakao.maps.Polyline({
            path,
            strokeWeight: 6,
            strokeColor: "#2B6FFF",
            strokeOpacity: 0.9,
        });

        line.setMap(map);
        setRouteLine(line);

        const bounds = new kakao.maps.LatLngBounds();
        path.forEach((p: any) => bounds.extend(p));
        map.setBounds(bounds);
    };

    /** 5) 길 안내 텍스트 생성 */
    const parseInstructions = (steps: any[]) => {
        if (!steps.length) return;

        const next = steps[0];
        const text = next.maneuver.instruction;
        const dist = next.distance;

        setNextInstruction(text);
        setRemainDist(dist);
    };

    /** 6) 전체 네비게이션 실행 */
    useEffect(() => {
        if (!map) return;

        (async () => {
            try {
                const dest = await geocodeAddress();
                const route = await loadRoute(dest.lat, dest.lon);

                drawRoute(route.geometry);
                parseInstructions(route.legs[0].steps);
            } catch (err) {
                alert("경로 계산 실패");
            }
        })();
    }, [map]);

    /** 7) GPS 실시간 업데이트 + 차량 아이콘 이동 */
    useEffect(() => {
        if (!map) return;

        const watch = navigator.geolocation.watchPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;

                const kakao = window.kakao;
                const newPos = new kakao.maps.LatLng(lat, lon);

                markerRef.current.setPosition(newPos);
                map.setCenter(newPos);
            },
            () => console.log("GPS 오류"),
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watch);
    }, [map]);

    return (
        <div className="w-full h-screen relative">

            {/* 안내 패널 */}
            <div className="absolute top-0 left-0 w-full bg-black bg-opacity-60 text-white p-4 text-lg font-semibold z-10">
                <div>{nextInstruction}</div>
                <div className="text-sm opacity-80">{remainDist.toFixed(0)}m 남음</div>
            </div>

            <div ref={mapRef} className="w-full h-full" />

        </div>
    );
};

export default NavigationPage;
