import React, { memo } from "react";
import type { Vehicle } from "../../../types/global";
import { formatPhone } from "../../../services/Register/utils";

interface Props {
    index: number;
    vehicle: Vehicle;
    onReturn: (id: string) => void;
    onOpenMap: (vehicle: Vehicle) => void;
}

const ActivityRow: React.FC<Props> = ({ index, vehicle, onReturn, onOpenMap }) => {
    return (
        <tr className="even:bg-gray-50">
            <td className="border border-black px-3 py-2">{index}</td>
            <td className="border border-black px-3 py-2">{vehicle.station}</td>
            <td className="border border-black px-3 py-2">{vehicle.callname}</td>
            <td className="border border-black px-3 py-2">{vehicle.type}</td>
            <td className="border border-black px-3 py-2">{vehicle.personnel}</td>
            <td className="border border-black px-3 py-2">{formatPhone(vehicle.contact)}</td>
            <td className="border border-black px-3 py-2">{vehicle.dispatchPlace}</td>
            <td className="border border-black px-3 py-2">{vehicle.content}</td>
            <td className="border border-black px-3 py-2">{vehicle.status}</td>
            <td className="border border-black px-2 py-2">
                <div className="flex gap-1 justify-center">
                    <button
                        className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"
                        onClick={() => onOpenMap(vehicle)}
                    >
                        지도
                    </button>
                    <button
                        onClick={() => onReturn(String(vehicle.id))}
                        className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600"
                    >
                        복귀
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default memo(ActivityRow);
