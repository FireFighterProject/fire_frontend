

// Header.tsx (훅/Router 없이 작동하는 안전 버전)
const menus = [
    { name: "메인", path: "/" },
    { name: "현황", path: "/status" },
    { name: "관리", path: "/manage" },
    { name: "출동", path: "/dispatch" },
    { name: "활동", path: "/activity" },
    { name: "지도", path: "/map" },
    { name: "통계", path: "/statistics" },
    { name: "보고서", path: "/report" },
];

const isActivePath = (path: string) => {
    const cur = typeof window !== "undefined" ? window.location.pathname : "/";
    if (path === "/") return cur === "/";
    // /status, /status/xxx 같이 시작하면 활성으로 판단
    return cur === path || cur.startsWith(path + "/");
};

const Header = () => {
    return (
        <header className="bg-red-600 text-white z-50 shadow-md">
            <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-2">
                <div className="text-base md:text-lg font-semibold">
                    동원차량 관리 프로그램
                </div>

                <nav className="flex items-center gap-5 md:gap-7">
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
            </div>
        </header>
    );
};

export default Header;
