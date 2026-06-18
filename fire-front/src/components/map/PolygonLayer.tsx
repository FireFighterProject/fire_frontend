/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useEffect, useRef } from "react";
import { loadGeoJsonForZoom } from "../../services/map/geoJsonLoader";
import type { Vehicle } from "../../types/map";

declare global {
    interface Window {
        kakao: any;
    }
}

type Props = {
    map: kakao.maps.Map | null;
    vehicles: Vehicle[];
    onRegionSelect: (regionName: string, regionVehicles: Vehicle[]) => void;
};

/** 점이 폴리곤 내부인지 판정 (ray-casting) */
const isPointInPolygon = (lat: number, lng: number, path: kakao.maps.LatLng[]) => {
    let inside = false;

    for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
        const xi = path[i].getLat();
        const yi = path[i].getLng();
        const xj = path[j].getLat();
        const yj = path[j].getLng();

        const intersect =
            yi > lng !== yj > lng &&
            lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

        if (intersect) inside = !inside;
    }

    return inside;
};

const PolygonLayer = ({ map, vehicles, onRegionSelect }: Props) => {
    const polygons = useRef<kakao.maps.Polygon[]>([]);
    const selectedPolygon = useRef<kakao.maps.Polygon | null>(null);
    const vehiclesRef = useRef(vehicles);
    const onRegionSelectRef = useRef(onRegionSelect);

    vehiclesRef.current = vehicles;
    onRegionSelectRef.current = onRegionSelect;

    useEffect(() => {
        if (!map) return;
        const kakao = window.kakao;
        let cancelled = false;
        let zoomListener: unknown = null;

        const clearPolygons = () => {
            polygons.current.forEach((p) => p.setMap(null));
            polygons.current = [];
        };

        const parseCoordinates = (geometry: any) => {
            if (geometry.type === "MultiPolygon") {
                return geometry.coordinates.map((poly: any) =>
                    poly[0].map(
                        (c: number[]) => new kakao.maps.LatLng(c[1], c[0])
                    )
                );
            }

            return [
                geometry.coordinates[0].map(
                    (c: number[]) => new kakao.maps.LatLng(c[1], c[0])
                ),
            ];
        };

        const handleSelect = (
            polygon: kakao.maps.Polygon,
            regionName: string,
            path: kakao.maps.LatLng[]
        ) => {
            if (selectedPolygon.current) {
                selectedPolygon.current.setOptions({
                    fillColor: "#ffffff",
                    strokeColor: "#004c80",
                    fillOpacity: 0.3,
                    strokeWeight: 2,
                });
            }

            polygon.setOptions({
                fillColor: "#4e79ff",
                strokeColor: "#0033bb",
                strokeWeight: 3,
                fillOpacity: 0.65,
            });

            selectedPolygon.current = polygon;

            const currentVehicles = vehiclesRef.current;
            const regionVehicles = currentVehicles.filter((v) => {
                if (!v.lat || !v.lng) return false;
                return isPointInPolygon(v.lat, v.lng, path);
            });

            onRegionSelectRef.current(regionName, regionVehicles);
        };

        const loadPolygons = async (level: number) => {
            clearPolygons();
            selectedPolygon.current = null;

            try {
                const geo = await loadGeoJsonForZoom(level);
                if (cancelled) return;

                const features = geo.features as any[];

                features.forEach((unit: any) => {
                    const regionName =
                        unit.properties.SIG_KOR_NM ||
                        unit.properties.CTY_KOR_NM ||
                        unit.properties.SIDO_NM;

                    const paths = parseCoordinates(unit.geometry);

                    paths.forEach((path: kakao.maps.LatLng[]) => {
                        const polygon = new kakao.maps.Polygon({
                            map,
                            path,
                            strokeWeight: 2,
                            strokeColor: "#004c80",
                            fillColor: "#ffffff",
                            fillOpacity: 0.15,
                        });

                        kakao.maps.event.addListener(polygon, "mouseover", () => {
                            if (selectedPolygon.current !== polygon) {
                                polygon.setOptions({ fillColor: "#9cf" });
                            }
                        });

                        kakao.maps.event.addListener(polygon, "mouseout", () => {
                            if (selectedPolygon.current !== polygon) {
                                polygon.setOptions({ fillColor: "#ffffff" });
                            }
                        });

                        kakao.maps.event.addListener(polygon, "click", () =>
                            handleSelect(polygon, regionName, path)
                        );

                        polygons.current.push(polygon);
                    });
                });
            } catch (e) {
                console.error("지도 폴리곤 GeoJSON 로드 실패:", e);
            }
        };

        void loadPolygons(map.getLevel());

        zoomListener = kakao.maps.event.addListener(map, "zoom_changed", () => {
            void loadPolygons(map.getLevel());
        });

        return () => {
            cancelled = true;
            if (zoomListener) {
                kakao.maps.event.removeListener(map, "zoom_changed", zoomListener);
            }
            clearPolygons();
            selectedPolygon.current = null;
        };
    }, [map]);

    return null;
};

export default memo(PolygonLayer);
