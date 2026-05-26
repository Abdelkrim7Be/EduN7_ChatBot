import { useEffect, useState } from "react";
import type { AdminUser, AdminStats } from "../types";
import { fetchAdminUsers, fetchAdminStats, updateUserRole } from "../api/client";
import { useToast } from "./ToastProvider";

const ROLE_STYLES: Record<string, string> = {
  admin:     "bg-red-500/20 text-red-300 border-red-500/30",
  professor: "bg-brand-gold/20 text-brand-gold border-brand-gold/30",
  student:   "bg-brand-blue/20 text-brand-blue-light border-brand-blue/30",
};

function timeAgo(ts: number): string {
  const delta = Date.now() / 1000 - ts;
  if (delta < 60)     return "à l'instant";
  if (delta < 3600)   return `${Math.floor(delta / 60)} min`;
  if (delta < 86400)  return `${Math.floor(delta / 3600)} h`;
  if (delta < 604800) return `${Math.floor(delta / 86400)} j`;
  return new Date(ts * 1000).toLocaleDateString("fr-FR");
}

interface StatCardProps { label: string; value: number; icon: React.ReactNode; color: string }
function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-brand-navy-light rounded-xl p-4 border border-brand-navy-border flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-white/40">{label}</p>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([fetchAdminUsers(), fetchAdminStats()])
      .then(([u, s]) => { setUsers(u); setStats(s); })
      .catch(() => toast("Erreur lors du chargement", "error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdating(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole as AdminUser["role"] } : u));
      toast("Rôle mis à jour", "success");
    } catch {
      toast("Erreur lors de la mise à jour", "error");
    } finally {
      setUpdating(null);
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-brand-surface-muted p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Page title */}
        <div>
          <h1 className="text-xl font-bold text-brand-navy">Panneau d'administration</h1>
          <p className="text-sm text-brand-gray-text mt-0.5">Gestion des utilisateurs et statistiques globales</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Utilisateurs" value={stats.user_count} color="bg-brand-blue/20"
              icon={<svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
            <StatCard label="Conversations" value={stats.conversation_count} color="bg-brand-gold/20"
              icon={<svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
            />
            <StatCard label="Messages" value={stats.message_count} color="bg-purple-500/20"
              icon={<svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>}
            />
            <StatCard label="Documents" value={stats.document_count} color="bg-green-500/20"
              icon={<svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            />
          </div>
        )}

        {/* Users table */}
        <div className="bg-white rounded-xl border border-brand-gray shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-gray">
            <h2 className="text-sm font-semibold text-brand-navy">Utilisateurs ({users.length})</h2>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm border border-brand-gray rounded-lg px-3 py-1.5 text-brand-navy placeholder-brand-gray-text focus:outline-none focus:ring-2 focus:ring-brand-blue/30 w-48"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-brand-surface-muted">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-brand-gray-text uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-gray-text uppercase tracking-wider">Rôle</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-gray-text uppercase tracking-wider hidden md:table-cell">Activité</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-gray-text uppercase tracking-wider hidden md:table-cell">Dernier accès</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-gray">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-brand-surface-muted transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-brand-navy">{user.name}</p>
                          <p className="text-xs text-brand-gray-text">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        disabled={updating === user.id}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1 rounded-lg border cursor-pointer
                          focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-transparent
                          ${ROLE_STYLES[user.role]} ${updating === user.id ? "opacity-50 cursor-wait" : ""}`}
                      >
                        <option value="student">student</option>
                        <option value="professor">professor</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex gap-3 text-xs text-brand-gray-text">
                        <span title="Conversations">{user.conversation_count} conv.</span>
                        <span title="Documents">{user.document_count} docs</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-brand-gray-text">
                      {timeAgo(user.last_seen)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-brand-gray-text">
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
