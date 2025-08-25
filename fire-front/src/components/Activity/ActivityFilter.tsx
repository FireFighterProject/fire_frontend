import React, { useState } from "react";

interface FilterState {
    sido: string;
    type: string;
    query: string;
}

interface Props {
    filter: FilterState;
    setFilter: (f: FilterState) => void;
}

const ActivityFilter: React.FC<Props> = ({ filter, setFilter }) => {
    const [search, setSearch] = useState(filter.query || "");

    const handleSearch = () => {
        setFilter({ ...filter, query: search });
    };

    return (
        <div className="flex items-center gap-3 mb-4">
            {/* 🔍 검색창 */}
            <input
                type="text"
                placeholder="검색 (호출명, 주소, 시도, 등)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                }}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button
                onClick={handleSearch}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
                검색
            </button>

            {/* 1차 필터 (시도) */}
            <select
                value={filter.sido}
                onChange={(e) => setFilter({ ...filter, sido: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
                <option value="전체">전체</option>
                <option value="경북">경북</option>
                <option value="서울">서울</option>
            </select>

            {/* 2차 필터 (차종) */}
            <select
                value={filter.type}
                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
                <option value="전체">전체</option>
                <option value="구조">구조</option>
                <option value="펌프">펌프</option>
            </select>
        </div>
    );
};

export default ActivityFilter;
