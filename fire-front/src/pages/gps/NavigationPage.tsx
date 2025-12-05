// src/pages/NavigationPage.tsx

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

declare global {
    interface Window {
        kakao: any;
        routePolyline: any;
    }
}

const NavigationPage = () => {
    const [params] = useSearchParams();

    const startLat = Number(params.get("startLat"));
    const startLon = Number(params.get("startLon"));
    const destAddress = params.get("dest") ?? "";

    const mapRef = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<any>(null);
    const [currentPos, setCurrentPos] = useState<any>(null);
    const markerRef = useRef<any>(null);

    let hasFitRoute = false;

    /** ================================
     *  0) 카카오 SDK 로드
     * ================================= */
    const loadKakaoSDK = () => {
        return new Promise<void>((resolve) => {
            if (window.kakao && window.kakao.maps) {
                resolve();
                return;
            }

            const script = document.createElement("script");
            script.src =
                `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAOMAP_API_KEY
                }&libraries=services&autoload=false`;

            script.onload = () => window.kakao.maps.load(resolve);
            document.head.appendChild(script);
        });
    };

    /** ================================
     *  1) 지도 초기화
     * ================================= */
    useEffect(() => {
        (async () => {
            await loadKakaoSDK();
            if (!mapRef.current) return;

            const kakao = window.kakao;
            const center = new kakao.maps.LatLng(startLat, startLon);

            const mapObj = new kakao.maps.Map(mapRef.current, {
                center,
                level: 5
            });

            setMap(mapObj);

            // 🔵 파란 화살표 마커
            markerRef.current = new kakao.maps.Marker({
                map: mapObj,
                position: center,
                image: new kakao.maps.MarkerImage(
                    "/icons/arrow-blue.png",
                    new kakao.maps.Size(48, 48),
                    { offset: new kakao.maps.Point(24, 24) }
                )
            });
        })();
    }, []);

    /** ================================
     *  2) 주소 → 좌표 변환
     * ================================= */
    const geocodeAddress = () =>
        new Promise<{ lat: number; lon: number }>((resolve, reject) => {
            const geocoder = new window.kakao.maps.services.Geocoder();
            geocoder.addressSearch(destAddress, (result: any, status: any) => {
                if (status === window.kakao.maps.services.Status.OK) {
                    resolve({
                        lat: Number(result[0].y),
                        lon: Number(result[0].x)
                    });
                } else reject("주소 변환 실패");
            });
        });

    /** ================================
     *  3) OSRM 경로 요청
     * ================================= */
    const getRoute = async (destLat: number, destLon: number) => {
        const url =
            `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${destLon},${destLat}?overview=full&steps=true&geometries=geojson`;

        const res = await fetch(url);
        const data = await res.json();

        return data.routes[0];
    };

    /** ================================
     *  4) 경로 그리기 (현재 위치 중심 고정)
     * ================================= */
    const drawRoute = (geometry: any, steps: any[]) => {
        const kakao = window.kakao;
        const path = geometry.coordinates.map(
            (c: any) => new kakao.maps.LatLng(c[1], c[0])
        );

        const bounds = new kakao.maps.LatLngBounds();
        path.forEach((p) => bounds.extend(p));

        // 🔥 최초 1회만 전체 경로 맞추기
        if (!hasFitRoute) {
            map.setBounds(bounds);
            hasFitRoute = true;
        }

        // 기존 경로 삭제
        if (window.routePolyline) window.routePolyline.setMap(null);

        const polyline = new kakao.maps.Polyline({
            path,
            strokeWeight: 7,
            strokeColor: "#3478F6",
            strokeOpacity: 0.9
        });

        polyline.setMap(map);
        window.routePolyline = polyline;
    };

    /** ================================
     *  5) 음성 안내
     * ================================= */
    const speak = (msg: string) => {
        const utter = new SpeechSynthesisUtterance(msg);
        utter.lang = "ko-KR";
        utter.rate = 1;
        speechSynthesis.cancel();
        speechSynthesis.speak(utter);
    };

    /** ================================
     *  6) GPS 실시간 추적 + 마커 회전
     * ================================= */
    useEffect(() => {
        if (!map || !markerRef.current) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, heading } = pos.coords;

                const kakao = window.kakao;
                const newPos = new kakao.maps.LatLng(latitude, longitude);

                setCurrentPos({ lat: latitude, lon: longitude });

                markerRef.current.setPosition(newPos);

                // 🔵 방향 회전
                markerRef.current.setAngle?.(heading || 0);

                // 🔥 항상 현재 위치 중심 유지
                map.panTo(newPos);
            },
            () => speak("GPS 신호가 약합니다."),
            { enableHighAccuracy: true, maximumAge: 0 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [map]);

    /** ================================
     *  7) 경로 계산 전체 로직
     * ================================= */
    useEffect(() => {
        if (!map) return;

        (async () => {
            try {
                const dest = await geocodeAddress();
                const route = await getRoute(dest.lat, dest.lon);

                drawRoute(route.geometry, route.legs[0].steps);

                speak("경로 안내를 시작합니다.");
            } catch (err) {
                alert("경로 계산 실패");
            }
        })();
    }, [map]);


    /** ================================
     *  화면 출력
     * ================================= */
    return <div className="w-full h-screen"><div ref={mapRef} className="w-full h-full" /></div>;
};

export default NavigationPage;
