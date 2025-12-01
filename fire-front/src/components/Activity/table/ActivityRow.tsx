import React from "react";
import type { Vehicle } from "../../../types/global";

interface Props {
    vehicle: Vehicle;
    onReturn: (id: string) => void;
}

const ActivityRow: React.FC<Props> = ({ vehicle, onReturn}) => {
    return (
        <tr className="even:bg-gray-50">
            <td className="border border-black px-3 py-2">{vehicle.sido}</td>
            <td className="border border-black px-3 py-2">{vehicle.station}</td>
            <td className="border border-black px-3 py-2">{vehicle.type}</td>
            <td className="border border-black px-3 py-2">{vehicle.callname}</td>
            <td className="border border-black px-3 py-2">{vehicle.capacity}</td>
            <td className="border border-black px-3 py-2">{vehicle.personnel}</td>
            <td className="border border-black px-3 py-2">{vehicle.avl}</td>
            <td className="border border-black px-3 py-2">{vehicle.pslte}</td>
            <td className="border border-black px-3 py-2">{vehicle.dispatchPlace}</td>
            <td className="border border-black px-3 py-2">{vehicle.content}</td>
            <td className="border border-black px-3 py-2">{vehicle.status}</td>
            <td className="border border-black px-2 py-2">
                <div className="flex gap-1 justify-center">
                    <button className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600">
                        지도
                    </button>
                    <button
                        onClick={() => onReturn(vehicle.id)}
                        className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600"
                    >
                        복귀
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default ActivityRow;
