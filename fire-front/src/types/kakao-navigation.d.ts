/* eslint-disable @typescript-eslint/no-explicit-any */
// src/types/kakao-navigation.d.ts

export type KakaoLatLng = {
    getLat(): number;
    getLng(): number;
};

export type KakaoLatLngBounds = {
    extend(pos: KakaoLatLng): void;
};

export type KakaoMap = {
    setCenter(pos: KakaoLatLng): void;
    setLevel(level: number): void;
    panTo(pos: KakaoLatLng): void;
    setBounds(bounds: KakaoLatLngBounds): void;
};

export type KakaoMarker = {
    setPosition(pos: KakaoLatLng): void;
    setMap(map: KakaoMap | null): void;
};

export type KakaoPolyline = {
    setMap(map: KakaoMap | null): void;
};

export type KakaoMaps = {
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    LatLngBounds: new () => KakaoLatLngBounds;
    Map: new (el: HTMLElement, options: any) => KakaoMap;
    Marker: new (opts: any) => KakaoMarker;
    Polyline: new (opts: any) => KakaoPolyline;
    load(cb: () => void): void;
};

export type KakaoNamespace = {
    maps: KakaoMaps;
};
