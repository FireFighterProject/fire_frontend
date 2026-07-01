import type { ElementType, ReactNode } from "react";

type Props = {
    children: ReactNode;
    className?: string;
    as?: ElementType;
};

/** 브라우저 자동 번역이 지령·주소 등 운영 문구를 바꾸지 않도록 보호 */
export default function NoTranslate({
    children,
    className = "",
    as: Tag = "span",
}: Props) {
    return (
        <Tag
            translate="no"
            lang="ko"
            className={className ? `notranslate ${className}` : "notranslate"}
        >
            {children}
        </Tag>
    );
}
