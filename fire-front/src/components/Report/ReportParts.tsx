import React, { memo } from "react";

export const PreviewSection = memo(function PreviewSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
            {children}
        </section>
    );
});

export const InfoRow = memo(function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) {
    return (
        <div className="mb-1 flex text-sm">
            <div className="w-32 text-gray-500">{label}</div>
            <div className="font-medium">{value}</div>
        </div>
    );
});

export const KPICard = memo(function KPICard({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-lg font-bold">{value}</p>
        </div>
    );
});

export const SimpleTable = memo(function SimpleTable({
    headers,
    rows,
}: {
    headers: string[];
    rows: (string | number)[][];
}) {
    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full border-collapse bg-white text-sm">
                <thead>
                    <tr className="bg-gray-100">
                        {headers.map((h) => (
                            <th
                                key={h}
                                className="whitespace-nowrap border-b px-3 py-2 text-left font-semibold text-gray-700"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td
                                className="px-3 py-6 text-center text-gray-500"
                                colSpan={headers.length}
                            >
                                데이터가 없습니다.
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, i) => (
                            <tr key={i} className="even:bg-gray-50">
                                {row.map((cell, j) => (
                                    <td
                                        key={j}
                                        className="whitespace-nowrap border-t px-3 py-2 text-gray-800"
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
});

export const Labeled = memo(function Labeled({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="mb-3">
            <p className="mb-1 text-xs text-gray-600">{label}</p>
            {children}
        </div>
    );
});

export function groupBy<T, K extends string | number>(
    arr: T[],
    keyFn: (x: T) => K
): Record<K, T[]> {
    return arr.reduce(
        (m, x) => {
            const k = keyFn(x);
            (m[k] ??= []).push(x);
            return m;
        },
        {} as Record<K, T[]>
    );
}

export const unique = <T,>(arr: T[]) => Array.from(new Set(arr));
