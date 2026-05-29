import { Link, useLocation } from "react-router-dom";

function NavItem({
  active,
  label,
  to,
}: {
  active?: boolean;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group relative block h-11 w-full text-sm font-bold tracking-wide transition-transform active:scale-[0.98]"
    >
      <div
        className={[
          "clip-hex absolute inset-0 transition-all duration-200",
          active
            ? "bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 shadow-[0_0_18px_rgba(249,115,22,0.28)]"
            : "bg-[#251713] group-hover:bg-[#321b15]",
        ].join(" ")}
      />
      <div
        className={[
          "clip-hex absolute inset-[1px] flex items-center justify-center transition-colors duration-200",
          active
            ? "bg-transparent text-white"
            : "bg-[#17100f] text-orange-100/45 group-hover:text-orange-100/80",
        ].join(" ")}
      >
        <span className="relative z-10">{label}</span>
      </div>
    </Link>
  );
}

function NavBar() {
  const location = useLocation();

  return (
    <nav className="mt-20 flex flex-col gap-3 px-1">
      <NavItem
        active={location.pathname === "/dashboard"}
        label="Dashboard"
        to="/dashboard"
      />
      <NavItem
        active={location.pathname.startsWith("/habit")}
        label="Habit"
        to="/habit"
      />
      <NavItem
        active={location.pathname.startsWith("/workflow")}
        label="Workflow"
        to="/workflow"
      />
      <NavItem
        active={location.pathname.startsWith("/advice")}
        label="Advice"
        to="/advice"
      />
    </nav>
  );
}

export default NavBar;
