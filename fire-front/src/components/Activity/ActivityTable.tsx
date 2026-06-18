import React, { memo } from "react";
import type { Vehicle } from "../../types/global";
import ActivityRow from "./table/ActivityRow";

interface Props {
    vehicles: Vehicle[];
    onReturn: (id: string) => void;
    onOpenMap: (vehicle: Vehicle) => void;
}

const ActivityTable: React.FC<Props> = ({ vehicles, onReturn, onOpenMap }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 text-sm text-center border-collapse">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="border border-gray-300 px-3 py-2">연번</th>
                        <th className="border border-gray-300 px-3 py-2">소방서</th>
                        <th className="border border-gray-300 px-3 py-2">호출명</th>
                        <th className="border border-gray-300 px-3 py-2">차종</th>
                        <th className="border border-gray-300 px-3 py-2">인원</th>
                        <th className="border border-gray-300 px-3 py-2">연락처</th>
                        <th className="border border-gray-300 px-3 py-2">출동장소</th>
                        <th className="border border-gray-300 px-3 py-2">내용</th>
                        <th className="border border-gray-300 px-3 py-2">상태</th>
                        <th className="border border-gray-300 px-3 py-2">조치</th>
                    </tr>
                </thead>
                <tbody>
                    {vehicles.map((v, idx) => (
                        <ActivityRow
                            key={v.id}
                            index={idx + 1}
                            vehicle={v}
                            onReturn={onReturn}
                            onOpenMap={onOpenMap}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default memo(ActivityTable);
