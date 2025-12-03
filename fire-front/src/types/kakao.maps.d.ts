// src/types/kakao.maps.d.ts
export { };

declare global {
    namespace kakao {
        export namespace maps {
            /** autoload=false 일 때 SDK 로딩 콜백 */
            export function load(callback: () => void): void;

            /** ------------------------------
             * LatLng (카카오 좌표 객체)
             * ------------------------------ */
            export class LatLng {
                constructor(lat: number, lng: number);
                getLat(): number;
                getLng(): number;

                /** 🔥 카카오 내부 필드 - optional 로 타입 오류 방지 */
                Ma?: number;
                La?: number;
            }

            /** 영역(남서-북동) */
            export class LatLngBounds {
                constructor(sw: LatLng, ne: LatLng);
                contain(latlng: LatLng): boolean;
            }

            /** 지도 컨트롤 공통 타입 */
            export type Control = object;

            /** 컨트롤 위치 */
            export enum ControlPosition {
                RIGHT,
                TOPRIGHT,
            }

            /** ------------------------------
             * 지도 (Map)
             * ------------------------------ */
            export class Map {
                constructor(container: HTMLElement, options: { center: LatLng; level: number });

                addControl(control: Control, position: ControlPosition): void;
                getBounds(): LatLngBounds;

                /** 🔥 PolygonLayer에서 필요 */
                getLevel(): number;
            }

            /** ------------------------------
             * 마커
             * ------------------------------ */
            export class Marker {
                constructor(options: { map: Map; position: LatLng });
                setMap(map: Map | null): void;
                getPosition(): LatLng;
            }

            /** 인포윈도우 */
            export class InfoWindow {
                constructor(options: { content: string });
                open(map: Map, marker: Marker): void;
                close(): void;
            }

            /** 지도 컨트롤 */
            export class ZoomControl { }
            export class MapTypeControl { }

            /** ------------------------------
             * 🔥 Polygon (지도 구역)
             * ------------------------------ */
            export class Polygon {
                constructor(options: {
                    map: Map | null;
                    path: LatLng[];
                    strokeWeight?: number;
                    strokeColor?: string;
                    strokeOpacity?: number;
                    strokeStyle?: string;
                    fillColor?: string;
                    fillOpacity?: number;
                });

                setMap(map: Map | null): void;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setOptions(options: any): void;
                getPath(): LatLng[];
            }

            /** ------------------------------
             * Rectangle (드래그 박스)
             * ------------------------------ */
            export class Rectangle {
                constructor(options: {
                    map: Map;
                    bounds: LatLngBounds;
                    strokeWeight: number;
                    strokeColor: string;
                    strokeOpacity: number;
                    strokeStyle: string;
                    fillColor: string;
                    fillOpacity: number;
                });

                setBounds(bounds: LatLngBounds): void;
                setMap(map: Map | null): void;
                getBounds(): LatLngBounds;
            }

            /** ------------------------------
             * 이벤트
             * ------------------------------ */
            export namespace event {
                export interface MapMouseEvent {
                    latLng: LatLng;
                }

                export function addListener(
                    target: Map | Marker | Polygon | Rectangle,
                    type: string,
                    handler: (evt?: MapMouseEvent) => void
                ): void;

                export function removeListener(
                    target: Map | Marker | Polygon | Rectangle,
                    type: string,
                    handler: (evt?: MapMouseEvent) => void
                ): void;
            }

            /** ------------------------------
             * 서비스 (주소/행정구역)
             * ------------------------------ */
            export namespace services {
                export type RegionResult = {
                    region_type: "H" | "B" | "S" | string;
                    region_1depth_name: string;
                };

                export class Geocoder {
                    coord2RegionCode(
                        lng: number,
                        lat: number,
                        callback: (result: RegionResult[], status: Status) => void
                    ): void;
                }

                export enum Status {
                    OK = "OK",
                }
            }
        }
    }

    /** window.kakao 타입 */
    interface Window {
        kakao: typeof kakao;
    }
}

export { };
