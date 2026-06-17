import type{ ReactNode } from "react";

type Props = {
    children: ReactNode;
};

export default function Td({ children }: Props) {
    return (
        <td className="border border-gray-300 px-3 py-2 text-center align-middle">
            {children}
        </td>
    );
}