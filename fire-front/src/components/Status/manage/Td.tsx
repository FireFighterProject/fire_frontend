// src/components/manage/Td.tsx
export default function Td({ children }) {
    return (
        <td className="px-3 py-2 border-t border-gray-100 whitespace-nowrap">
            {children}
        </td>
    );
}
