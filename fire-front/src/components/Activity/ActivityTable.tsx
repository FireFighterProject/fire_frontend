import React from "react";
import type { Vehicle } from "../../types/global";
import ActivityRow from "./table/ActivityRow";

interface Props {
    vehicles: Vehicle[];
    onReturn: (id: string) => void;
    onRelocate: (id: string) => void;
}

const ActivityTable: React.FC<Props> = ({ vehicles, onReturn, onRelocate }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border border-black text-sm text-center border-collapse">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="border border-black px-3 py-2">시도</th>
                        <th className="border border-black px-3 py-2">소방서</th>
                        <th className="border border-black px-3 py-2">차종</th>
                        <th className="border border-black px-3 py-2">호출명</th>
                        <th className="border border-black px-3 py-2">용량</th>
                        <th className="border border-black px-3 py-2">인원</th>
                        <th className="border border-black px-3 py-2">AVL</th>
                        <th className="border border-black px-3 py-2">PS-LTE</th>
                        <th className="border border-black px-3 py-2">출동장소</th>
                        <th className="border border-black px-3 py-2">내용</th>
                        <th className="border border-black px-3 py-2">상태</th>
                        <th className="border border-black px-3 py-2">조치</th>
                    </tr>
                </thead>
                <tbody>
                    {vehicles.map((v) => (
                        <ActivityRow
                            key={v.id}
                            vehicle={v}
                            onReturn={onReturn}
                            onRelocate={onRelocate}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ActivityTable;
