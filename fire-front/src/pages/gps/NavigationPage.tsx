/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/gps/NavigationPage.tsx

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type{  KakaoMarker, KakaoMap, KakaoPolyline } from "../../types/kakao-navigation";

declare global {
    interface Window {
        kakao: any;
        routePolyline?: KakaoPolyline | null;
    }
}

type TmapRouteResponse = {
    type: string;
    geometry: {
        type: string;
        coordinates: number[][];
    };
    properties: any;
};

const NavigationPage = () => {
    const [params] = useSearchParams();

    const startLat = Number(params.get("startLat"));
    const startLon = Number(params.get("startLon"));
    const destLat = Number(params.get("destLat"));
    const destLon = Number(params.get("destLon"));

    const mapRef = useRef<HTMLDivElement | null>(null);
    const markerRef = useRef<KakaoMarker | null>(null);
    const [map, setMap] = useState<KakaoMap | null>(null);

    const loadKakao = useCallback((): Promise<void> => {
        return new Promise((resolve) => {
            if (window.kakao?.maps) return resolve();

            const script = document.createElement("script");
            script.src =
                `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAOMAP_API_KEY}&autoload=false&libraries=services`;

            script.onload = () => window.kakao.maps.load(resolve);
            document.head.appendChild(script);
        });
    }, []);

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
            });
        })();
    }, [loadKakao, startLat, startLon]);

    const requestTmapRoute = useCallback(async (): Promise<TmapRouteResponse> => {
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
                    "appKey": import.meta.env.VITE_TMAP_API_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            }
        );

        const raw = await res.json();
        console.log("RAW TMAP RESPONSE:", raw);

        if (!raw.geometry?.coordinates) {
            throw new Error("TMAP geometry.coordinates 없음");
        }

        return raw as TmapRouteResponse;
    }, [startLat, startLon, destLat, destLon]);

    const drawRoute = useCallback(
        (route: TmapRouteResponse) => {
            if (!map) return;

            const coords = route.geometry.coordinates.map(
                ([lon, lat]) => new window.kakao.maps.LatLng(lat, lon)
            );

            if (window.routePolyline) {
                window.routePolyline.setMap(null);
            }

            const poly = new window.kakao.maps.Polyline({
                map,
                path: coords,
                strokeWeight: 7,
                strokeColor: "#1E90FF",
            });

            window.routePolyline = poly;

            const bounds = new window.kakao.maps.LatLngBounds();
            coords.forEach((p) => bounds.extend(p));

            map.setBounds(bounds);
        },
        [map]
    );


    useEffect(() => {
        if (!map) return;

        (async () => {
            try {
                const route = await requestTmapRoute();
                drawRoute(route);
            } catch (err) {
                console.error(err);
                alert("경로 생성 실패… (자동차 경로 API 구조 확인 필요)");
            }
        })();
    }, [map, requestTmapRoute, drawRoute]);

    return <div ref={mapRef} className="w-full h-screen" />;
};

export default NavigationPage;
