// src/utils/stats.ts
export const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

export const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);

export const avg = (arr: number[]) => arr.length ? Math.round(sum(arr) / arr.length) : 0;

export const groupBy = <T, K extends string | number>(
    arr: T[],
    key: (x: T) => K
) =>
    arr.reduce<Record<K, T[]>>((m, x) => {
        const k = key(x);
        (m[k] ??= []).push(x);
        return m;
    }, {} as Record<K, T[]>);
