// src/types/kakao.maps.d.ts
export { };

declare global {
    namespace kakao {
        export namespace maps {
            /** autoload=false 일 때 SDK 로딩 콜백 */
            export function load(callback: () => void): void;

            /** 좌표 */
            export class LatLng {
                constructor(lat: number, lng: number);
                getLat(): number;
                getLng(): number;
            }

            /** 영역(남서-북동) */
            export class LatLngBounds {
                constructor(sw: LatLng, ne: LatLng);
                contain(latlng: LatLng): boolean;
            }

            /** 지도 컨트롤 공통 타입 (빈 인터페이스 대신 object로) */
            export type Control = object;

            /** 지도 컨트롤 위치 */
            export enum ControlPosition {
                RIGHT,
                TOPRIGHT,
            }

            /** 지도 */
            export class Map {
                constructor(container: HTMLElement, options: { center: LatLng; level: number });
                addControl(control: Control, position: ControlPosition): void;
                getBounds(): LatLngBounds;
            }

            /** 마커 */
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

            /** 컨트롤들 */
            export class ZoomControl { }
            export class MapTypeControl { }
            /** 드래그 박스 */
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

            /** 이벤트 */
            export namespace event {
                /** 마우스 이벤트(우리가 쓰는 필드만) */
                export interface MapMouseEvent {
                    latLng: LatLng;
                }
                export function addListener(
                    target: Map | Marker | Rectangle,
                    type: string,
                    handler: (evt?: MapMouseEvent) => void
                ): void;
                export function removeListener(
                    target: Map | Marker | Rectangle,
                    type: string,
                    handler: (evt?: MapMouseEvent) => void
                ): void;
            }

            /** 서비스 */
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

    interface Window {
        kakao: typeof kakao;
    }
}
export { };