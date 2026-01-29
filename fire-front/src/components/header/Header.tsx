const menus = [
    { name: "메인", path: "/" },
    { name: "자원등록", path: "/status" },
    { name: "자원배분", path: "/manage" },
    { name: "자원관리", path: "/activity" },
    { name: "지도", path: "/map" },
    { name: "통계", path: "/statistics" },
    { name: "보고서", path: "/report" },
];

const isActivePath = (path: string) => {
    const cur = typeof window !== "undefined" ? window.location.pathname : "/";
    if (path === "/") return cur === "/";
    return cur === path || cur.startsWith(path + "/");
};

const Header = () => {
    return (
        <header className="bg-red-600 text-white z-50 shadow-md">
            <div className="mx-auto max-w-screen-2xl px-4 py-2 flex items-center">
                {/* 왼쪽: 로고 (왼쪽 끝 고정) */}
                <div className="flex-1 text-base md:text-lg font-semibold">
                    GDRS 보조 시스템
                </div>

                {/* 가운데: 메뉴 (정중앙 정렬) */}
                <nav className="flex-1 flex items-center justify-center gap-5 md:gap-7">
                    {menus.map((m) => {
                        const active = isActivePath(m.path);
                        return (
                            <a
                                key={m.path}
                                href={m.path}
                                className={[
                                    "relative pb-1 text-sm md:text-base transition hover:opacity-80",
                                    active
                                        ? "after:absolute after:left-0 after:right-0 after:-bottom-[2px] after:h-[2px] after:bg-white after:content-['']"
                                        : "",
                                ].join(" ")}
                            >
                                {m.name}
                            </a>
                        );
                    })}
                </nav>

                {/* 오른쪽: 빈 공간(좌우 균형 맞추기용) */}
                <div className="flex-1" />
            </div>
        </header>
    );
};

export default Header;
