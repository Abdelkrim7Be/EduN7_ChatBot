import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bot,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

type NavItem = {
  to: string;
  label: string;
  permission: string;
  icon: React.ReactNode;
};

const NAV: NavItem[] = [
  { to: "/admin/dashboard", label: "Tableau de bord", permission: "admin.dashboard.view", icon: <LayoutDashboard className="w-4 h-4" /> },
  { to: "/admin/users",     label: "Utilisateurs",    permission: "admin.users.manage", icon: <Users className="w-4 h-4" /> },
  { to: "/admin/roles",     label: "Rôles",           permission: "admin.roles.manage", icon: <Shield className="w-4 h-4" /> },
  { to: "/admin/documents", label: "Documents",       permission: "admin.documents.manage", icon: <FileText className="w-4 h-4" /> },
  { to: "/admin/conversations", label: "Conversations", permission: "admin.conversations.manage", icon: <MessageSquare className="w-4 h-4" /> },
  { to: "/admin/audit-log", label: "Journal d'audit", permission: "admin.audit.view", icon: <ClipboardList className="w-4 h-4" /> },
  { to: "/admin/announcements", label: "Annonces", permission: "admin.announcements.manage", icon: <Megaphone className="w-4 h-4" /> },
  { to: "/admin/ai-test",   label: "Test ENSET AI",   permission: "admin.ai.test", icon: <Bot className="w-4 h-4" /> },
  { to: "/admin/settings",  label: "Paramètres",      permission: "admin.settings.manage", icon: <Settings className="w-4 h-4" /> },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isRole, hasPermission } = useAuth();
  const visibleNav = NAV.filter((item) => isRole("admin") || hasPermission(item.permission));
  const activeItem = NAV.find((item) => location.pathname.startsWith(item.to));

  return (
    <div className="admin-console flex flex-1 overflow-hidden bg-black text-white font-mono paper-texture">
      <aside className="w-64 border-r border-border-subtle flex flex-col h-full bg-black shrink-0 relative z-20">
        <div className="p-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-xl font-bold tracking-tighter text-white hover:text-accent transition-colors"
          >
            ENSET AI
          </button>
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>

        <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar">
          <div className="mb-8">
            <button
              onClick={() => navigate("/")}
              className="w-full text-left py-2 px-3 text-sm text-white border border-white/20 hover:border-white hover:bg-white hover:text-black transition-all duration-300 rounded-sm"
            >
              ← ESPACE DE TRAVAIL
            </button>
          </div>

          <div className="mb-6">
            <div className="text-[10px] text-gray-600 uppercase tracking-widest px-3 mb-3">
              Administration
            </div>
            <div className="space-y-4">
              {visibleNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group cursor-pointer flex items-center gap-2.5 px-3 text-sm font-medium transition-colors ${
                      isActive ? "text-white" : "text-gray-500 hover:text-white"
                    }`
                  }
                >
                  <span className="text-gray-600 group-hover:text-white transition-colors">
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col bg-black paper-texture">
        <div className="h-14 shrink-0 border-b border-border-subtle bg-black/80 px-6 backdrop-blur-md flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-gray-500">
            Administration
          </div>
          <div className="text-xs font-bold text-white">
            {activeItem?.label ?? "Console"}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
