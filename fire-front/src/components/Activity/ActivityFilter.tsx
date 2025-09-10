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
        <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* 🔍 검색창 */}
            <input
                type="text"
                placeholder="검색 (호출명, 주소, 시도 등)"
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
                <option value="서울">서울</option>
                <option value="경기">경기</option>
                <option value="인천">인천</option>
                <option value="부산">부산</option>
                <option value="대구">대구</option>
                <option value="대전">대전</option>
                <option value="광주">광주</option>
                <option value="울산">울산</option>
                <option value="세종">세종</option>
                <option value="강원">강원</option>
                <option value="경북">경북</option>
                <option value="경남">경남</option>
                <option value="충북">충북</option>
                <option value="충남">충남</option>
                <option value="전북">전북</option>
                <option value="전남">전남</option>
                <option value="제주">제주</option>
            </select>

            {/* 2차 필터 (차종) */}
            <select
                value={filter.type}
                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
                <option value="전체">전체</option>
                <option value="경펌">경펌</option>
                <option value="소펌">소펌</option>
                <option value="중펌">중펌</option>
                <option value="대펌">대펌</option>
                <option value="중형탱크">중형탱크</option>
                <option value="대형탱크">대형탱크</option>
                <option value="급수탱크">급수탱크</option>
                <option value="화학">화학</option>
                <option value="산불">산불</option>
                <option value="험지">험지</option>
                <option value="로젠바우어">로젠바우어</option>
                <option value="산불신속팀">산불신속팀</option>
                <option value="구조">구조</option>
                <option value="구급">구급</option>
                <option value="지휘">지휘</option>
                <option value="조사">조사</option>
                <option value="굴절">굴절</option>
                <option value="고가">고가</option>
                <option value="배연">배연</option>
                <option value="회복">회복</option>
                <option value="지원">지원</option>
                <option value="기타">기타</option>
            </select>

        </div>
    );
};

export default ActivityFilter;
