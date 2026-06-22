const SKY_LABELS: Record<string, string> = {
    "1": "맑음",
    "2": "구름많음",
    "3": "흐림",
    "4": "흐림",
};

const PTY_LABELS: Record<string, string> = {
    "0": "없음",
    "1": "비",
    "2": "비/눈",
    "3": "눈",
    "4": "소나기",
};

export function formatSky(value?: string): string {
    if (!value) return "-";
    return SKY_LABELS[value] ?? value;
}

export function formatPty(value?: string): string {
    if (!value) return "-";
    return PTY_LABELS[value] ?? value;
}
