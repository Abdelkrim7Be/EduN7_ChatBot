import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, FileText, MessageSquare, Settings } from "lucide-react";

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
};

const NAV: NavItem[] = [
  { to: "/admin/dashboard", label: "Tableau de bord", icon: <LayoutDashboard className="w-4 h-4" /> },
  { to: "/admin/users",     label: "Utilisateurs",    icon: <Users className="w-4 h-4" /> },
  { to: "/admin/documents", label: "Documents",       icon: <FileText className="w-4 h-4" /> },
  { to: "/admin/conversations", label: "Conversations", icon: <MessageSquare className="w-4 h-4" /> },
  { to: "/admin/settings",  label: "Paramètres",      icon: <Settings className="w-4 h-4" /> },
];

export function AdminLayout() {
  return (
    <div className="flex flex-1 overflow-hidden bg-canvas">
      {/* Left nav */}
      <nav className="w-56 flex-shrink-0 bg-surface-1/80 backdrop-blur-xl border-r border-hairline flex flex-col py-5 gap-0.5 px-3">
        <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-widest text-fg-muted">
          Administration
        </p>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                isActive
                  ? "bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(var(--color-accent),0.2)]"
                  : "text-fg-secondary hover:text-fg hover:bg-surface-3"
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
