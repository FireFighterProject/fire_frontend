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
    const [vehicleMarker, setVehicleMarker] = useState<any>(null);
    const [routeLine, setRouteLine] = useState<any>(null);

    const [distance, setDistance] = useState<string>("");
    const [duration, setDuration] = useState<string>("");

    /* ============================================================
     *  0) Kakao SDK 로드
     * ============================================================ */
    const loadKakaoSDK = () =>
        new Promise<void>((resolve) => {
            if (window.kakao?.maps) {
                resolve();
                return;
            }
            const script = document.createElement("script");
            script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAOMAP_API_KEY
                }&libraries=services&autoload=false`;

            script.onload = () => window.kakao.maps.load(() => resolve());
            document.head.appendChild(script);
        });

    /* ============================================================
     *  1) 지도 초기화 (큰 화면 + 고정 레벨)
     * ============================================================ */
    useEffect(() => {
        (async () => {
            await loadKakaoSDK();

            if (!mapRef.current) return;

            const kakao = window.kakao;
            const center = new kakao.maps.LatLng(startLat, startLon);

            const mapObj = new kakao.maps.Map(mapRef.current, {
                center,
                level: 5,
            });

            setMap(mapObj);

            // 차량 현재 위치 마커
            const marker = new kakao.maps.Marker({
                map: mapObj,
                position: center,
                image: new kakao.maps.MarkerImage(
                    "https://cdn-icons-png.flaticon.com/512/2967/2967350.png",
                    new kakao.maps.Size(42, 42)
                ),
            });

            setVehicleMarker(marker);
        })();
    }, []);

    /* ============================================================
     *  2) 주소 → 좌표 변환
     * ============================================================ */
    const geocodeAddress = () =>
        new Promise<{ lat: number; lon: number }>((resolve, reject) => {
            const geocoder = new window.kakao.maps.services.Geocoder();
            geocoder.addressSearch(destAddress, (res: any, status: any) => {
                if (status === window.kakao.maps.services.Status.OK) {
                    resolve({
                        lat: Number(res[0].y),
                        lon: Number(res[0].x),
                    });
                } else reject("주소 변환 실패");
            });
        });

    /* ============================================================
     *  3) OSRM API — 실제 경로 요청
     * ============================================================ */
    const requestRoute = async (destLat: number, destLon: number) => {
        const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${destLon},${destLat}?overview=full&geometries=geojson&steps=true`;

        const res = await fetch(url);
        const data = await res.json();

        // 거리 & 예상 시간 표기
        setDistance((data.routes[0].distance / 1000).toFixed(1) + " km");
        setDuration(Math.round(data.routes[0].duration / 60) + " 분");

        return data.routes[0].geometry.coordinates;
    };

    /* ============================================================
     *  4) 경로 그리기 + 지도 맞추기
     * ============================================================ */
    const drawRoute = (coords: any[]) => {
        if (!map) return;

        const kakao = window.kakao;

        const path = coords.map((c: any) => new kakao.maps.LatLng(c[1], c[0]));

        // 기존 라인 삭제
        if (routeLine) routeLine.setMap(null);

        const polyline = new kakao.maps.Polyline({
            map,
            path,
            strokeWeight: 7,
            strokeColor: "#FF3B30", // 소방차 빨간색
            strokeOpacity: 0.9,
            strokeStyle: "solid",
        });

        setRouteLine(polyline);

        // 화면 경로 자동 맞추기
        const bounds = new kakao.maps.LatLngBounds();
        path.forEach((p: any) => bounds.extend(p));
        map.setBounds(bounds);
    };

    /* ============================================================
     *  5) 차량 GPS 실시간 반영
     * ============================================================ */
    useEffect(() => {
        if (!map || !vehicleMarker) return;

        const interval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;

                    const kakao = window.kakao;
                    const newPos = new kakao.maps.LatLng(lat, lon);

                    vehicleMarker.setPosition(newPos);

                    // 차량을 항상 지도 중앙에 유지
                    map.panTo(newPos);
                },
                () => { },
                { enableHighAccuracy: true }
            );
        }, 2000);

        return () => clearInterval(interval);
    }, [map, vehicleMarker]);

    /* ============================================================
     *  6) 초기 경로 로딩
     * ============================================================ */
    useEffect(() => {
        if (!map) return;

        (async () => {
            try {
                const dest = await geocodeAddress();
                const route = await requestRoute(dest.lat, dest.lon);
                drawRoute(route);
            } catch (err) {
                alert("경로 계산 실패");
                console.error(err);
            }
        })();
    }, [map]);

    /* ============================================================
     *  UI 렌더링
     * ============================================================ */
    return (
        <div className="w-full h-screen flex flex-col bg-black text-white">
            {/* 상단 정보 */}
            <div className="p-4 bg-red-600 text-white text-xl font-bold flex justify-between">
                <span>🚒 출동 네비게이션</span>
                <span>{distance} / {duration}</span>
            </div>

            {/* 지도 */}
            <div ref={mapRef} className="flex-1 w-full" />

            {/* 하단 */}
            <div className="p-4 flex justify-center bg-gray-900">
                <button
                    onClick={() =>
                        window.location.href = `kakaomap://route?ep=${encodeURIComponent(destAddress)}`
                    }
                    className="w-full py-4 text-xl bg-blue-600 rounded-xl font-semibold"
                >
                    🚘 카카오내비로 안내
                </button>
            </div>
        </div>
    );
};

export default NavigationPage;
