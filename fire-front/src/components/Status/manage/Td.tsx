import type{ ReactNode } from "react";

type Props = {
    children: ReactNode;
};

export default function Td({ children }: Props) {
    return <td className="px-3 py-2">{children}</td>;
}