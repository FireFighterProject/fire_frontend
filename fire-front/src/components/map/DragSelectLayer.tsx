import { useEffect, useRef } from "react";
import type { MapVehicle } from "../../types/map";

type Props = {
    map: kakao.maps.Map;
    vehicles: MapVehicle[];
    onSelect: (selected: MapVehicle[]) => void;
};

const DragSelectLayer = ({ map, vehicles, onSelect }: Props) => {
    const dragStart = useRef<kakao.maps.LatLng | null>(null);
    const dragRect = useRef<kakao.maps.Rectangle | null>(null);
    const isDragging = useRef(false);

    const removeRect = () => {
        if (dragRect.current) {
            dragRect.current.setMap(null);
            dragRect.current = null;
        }
    };

    useEffect(() => {
        const kakao = window.kakao;

        /** 마우스 다운 */
        const onMouseDown = (e: any) => {
            isDragging.current = true;
            dragStart.current = e.latLng;

            // 기존 박스 제거
            removeRect();
        };

        /** 마우스 이동 */
        const onMouseMove = (e: any) => {
            if (!isDragging.current || !dragStart.current) return;

            const start = dragStart.current;
            const end = e.latLng;

            const bounds = new kakao.maps.LatLngBounds();
            bounds.extend(start);
            bounds.extend(end);

            // 기존 박스 제거
            removeRect();

            // 점선 + 연한 빨간색 박스
            dragRect.current = new kakao.maps.Rectangle({
                map,
                bounds,
                strokeWeight: 2,
                strokeColor: "#ff0000",
                strokeOpacity: 0.6,
                strokeStyle: "dashed",
                fillColor: "#ff0000",
                fillOpacity: 0.15,
            });
        };

        /** 마우스 업 (선택 완료) */
        const onMouseUp = () => {
            if (!isDragging.current || !dragStart.current || !dragRect.current) {
                isDragging.current = false;
                dragStart.current = null;
                return;
            }

            isDragging.current = false;

            const bounds = dragRect.current.getBounds();

            const selected = vehicles.filter((v) =>
                bounds.contain(new kakao.maps.LatLng(v.lat, v.lng))
            );

            onSelect(selected);

            dragStart.current = null;
        };

        /** 🔥 다른 행동(지도 클릭 / 드래그 시작 등) 시 박스 즉시 제거 */
        const onMapClick = () => {
            if (!isDragging.current) removeRect();
        };

        kakao.maps.event.addListener(map, "mousedown", onMouseDown);
        kakao.maps.event.addListener(map, "mousemove", onMouseMove);
        kakao.maps.event.addListener(map, "mouseup", onMouseUp);
        kakao.maps.event.addListener(map, "click", onMapClick);

        return () => {
            kakao.maps.event.removeListener(map, "mousedown", onMouseDown);
            kakao.maps.event.removeListener(map, "mousemove", onMouseMove);
            kakao.maps.event.removeListener(map, "mouseup", onMouseUp);
            kakao.maps.event.removeListener(map, "click", onMapClick);
        };
    }, [map, vehicles, onSelect]);

    return null;
};

export default DragSelectLayer;
