// src/components/statistics/common.tsx
import React from "react";

export const KPI: React.FC<{ title: string; value: string | number }> = ({
    title,
    value,
}) => (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-xs text-gray-500">{title}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
);

export type TableColumn = {
    key: string;
    header: string;
    width?: string;
    align?: "left" | "center" | "right";
};

export type TableRow = Record<string, React.ReactNode>;

export const StatsTable: React.FC<{
    columns: TableColumn[];
    rows: TableRow[];
    emptyText?: string;
}> = ({ columns, rows, emptyText = "데이터가 없습니다." }) => (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full table-fixed text-sm">
            <thead>
                <tr className="bg-gray-50 text-gray-700">
                    {columns.map((c) => (
                        <th
                            key={c.key}
                            className={`px-3 py-2 font-semibold ${c.align === "left"
                                    ? "text-left"
                                    : c.align === "right"
                                        ? "text-right"
                                        : "text-center"
                                }`}
                            style={{ width: c.width }}
                        >
                            {c.header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 ? (
                    <tr>
                        <td
                            className="px-3 py-8 text-center text-gray-500"
                            colSpan={columns.length}
                        >
                            {emptyText}
                        </td>
                    </tr>
                ) : (
                    rows.map((r, i) => (
                        <tr
                            key={i}
                            className="border-t border-gray-100 hover:bg-gray-50"
                        >
                            {columns.map((c) => (
                                <td
                                    key={c.key}
                                    className={`px-3 py-2 ${c.align === "left"
                                            ? "text-left"
                                            : c.align === "right"
                                                ? "text-right"
                                                : "text-center"
                                        }`}
                                >
                                    {r[c.key]}
                                </td>
                            ))}
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    </div>
);

export const StatsModal: React.FC<{
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="max-h-[80vh] w-[min(900px,92vw)] overflow-auto rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-100 p-3">
                    <div className="text-base font-bold">{title}</div>
                    <button
                        className="h-8 w-8 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
};

export const MiniBar: React.FC<{
    value: number;
    max: number;
    legend?: string;
}> = ({ value, max, legend }) => {
    const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
    return (
        <div className="flex items-center gap-2">
            <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${pct}%` }}
                />
            </div>
            {legend && <span className="text-xs text-gray-500">{legend}</span>}
        </div>
    );
};

export const SideMenu: React.FC<{
    open: boolean;
    items: { key: string; label: string }[];
    active: string;
    onSelect: (key: string) => void;
}> = ({ open, items, active, onSelect }) => (
    <aside
        className={`z-10 w-60 border-r border-gray-200 bg-gray-50 transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"
            }`}
    >
        <div className="px-4 pb-2 pt-3 text-xs text-gray-600">통계항목</div>
        <ul className="space-y-1 p-2">
            {items.map((m) => (
                <li key={m.key}>
                    <button
                        onClick={() => onSelect(m.key)}
                        className={`w-full rounded-lg border px-3 py-2 text-left hover:bg-white ${active === m.key
                                ? "border-gray-300 bg-white font-semibold"
                                : "border-transparent"
                            }`}
                    >
                        {m.label}
                    </button>
                </li>
            ))}
        </ul>
    </aside>
);
