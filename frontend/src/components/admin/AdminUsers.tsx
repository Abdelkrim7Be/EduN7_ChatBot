import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import type { AdminUser } from "../../types";
import { fetchAdminUsers, updateUserRole } from "../../api/client";
import { useToast } from "../ToastProvider";

const ROLE_STYLES: Record<string, string> = {
  admin:     "bg-danger/10 text-danger border-danger/30",
  professor: "bg-gold/10 text-gold border-gold/30",
  student:   "bg-accent/10 text-accent border-accent/30",
};

function timeAgo(ts: number): string {
  const delta = Date.now() / 1000 - ts;
  if (delta < 60) return "à l'instant";
  if (delta < 3600) return `${Math.floor(delta / 60)} min`;
  if (delta < 86400) return `${Math.floor(delta / 3600)} h`;
  if (delta < 604800) return `${Math.floor(delta / 86400)} j`;
  return new Date(ts * 1000).toLocaleDateString("fr-FR");
}

export function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "professor" | "admin">("all");

  useEffect(() => {
    fetchAdminUsers()
      .then(setUsers)
      .catch(() => toast("Erreur lors du chargement", "error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdating(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, role: newRole as AdminUser["role"] } : u)
      );
      toast("Rôle mis à jour", "success");
    } catch {
      toast("Erreur lors de la mise à jour", "error");
    } finally {
      setUpdating(null);
    }
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = {
    all:       users.length,
    student:   users.filter((u) => u.role === "student").length,
    professor: users.filter((u) => u.role === "professor").length,
    admin:     users.filter((u) => u.role === "admin").length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-fg">Utilisateurs</h1>
        <p className="text-sm text-fg-secondary mt-0.5">
          {users.length} compte{users.length !== 1 ? "s" : ""} enregistré{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            type="text"
            placeholder="Nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-hairline bg-surface-1 rounded-xl pl-9 pr-3 py-2.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/30 transition-shadow"
          />
        </div>
        <div className="flex items-center gap-1 bg-surface-2 border border-hairline rounded-xl p-1">
          {(["all", "student", "professor", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                roleFilter === r
                  ? "bg-surface-1 text-fg shadow-soft"
                  : "text-fg-secondary hover:text-fg"
              }`}
            >
              {r === "all" ? "Tous" : r}{" "}
              <span className="text-fg-muted">({counts[r]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-1 rounded-2xl border border-hairline shadow-soft overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2/60 border-b border-hairline">
                <th className="text-left px-5 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Utilisateur</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Rôle</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider hidden md:table-cell">Activité</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider hidden lg:table-cell">Inscrit le</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider hidden md:table-cell">Vu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-surface-2/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-accent-contrast text-xs font-bold flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-fg">{user.name}</p>
                        <p className="text-xs text-fg-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={user.role}
                      disabled={updating === user.id}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border cursor-pointer bg-transparent
                        focus:outline-none focus:ring-2 focus:ring-accent/30
                        ${ROLE_STYLES[user.role]} ${updating === user.id ? "opacity-50 cursor-wait" : ""}`}
                    >
                      <option value="student">student</option>
                      <option value="professor">professor</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <div className="flex gap-3 text-xs text-fg-secondary">
                      <span title="Conversations">{user.conversation_count} conv.</span>
                      <span title="Documents">{user.document_count} docs</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-fg-secondary">
                    {new Date(user.created_at * 1000).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell text-xs text-fg-secondary">
                    {timeAgo(user.last_seen)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-fg-muted">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
