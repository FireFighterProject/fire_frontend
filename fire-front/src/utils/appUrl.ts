const DEFAULT_PUBLIC_APP_URL = "https://fire-management.rjsgud.com";

/** 단말기 문자·링크에 쓸 공개 사이트 주소 */
export function getPublicAppUrl(): string {
    const configured = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
    if (configured) return configured.replace(/\/$/, "");

    if (typeof window !== "undefined" && window.location.origin) {
        return window.location.origin;
    }

    return DEFAULT_PUBLIC_APP_URL;
}

export function buildAppPath(path: string): string {
    const base = getPublicAppUrl();
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalized}`;
}
