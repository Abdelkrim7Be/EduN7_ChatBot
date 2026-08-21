import { useEffect, useState } from "react";
import {
  Users,
  MessageSquare,
  FileText,
  Activity,
  TrendingUp,
  UserCheck,
  Ban,
  BarChart3,
  Server,
  Clock,
} from "lucide-react";
import type { ExtendedStats } from "../../types";
import { fetchExtendedStats } from "../../api/client";
import { useToast } from "../ToastProvider";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string;
  sub?: string;
}

function StatCard({ label, value, icon, colorClass, sub }: StatCardProps) {
  return (
    <div className="bg-surface-1 rounded-2xl p-5 border border-hairline shadow-soft flex items-center gap-4 hover:shadow-elevated transition-shadow duration-200">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-fg tabular-nums">
          {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
        </p>
        <p className="text-xs text-fg-secondary font-medium">{label}</p>
        {sub && <p className="text-[10px] text-fg-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MiniBarChart({ data, maxBars = 30 }: { data: { day_offset: number; count: number }[]; maxBars?: number }) {
  if (!data.length) return <p className="text-fg-muted text-sm py-4 text-center">Pas encore de données</p>;
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  // Fill gaps for last N days
  const filled: number[] = Array(maxBars).fill(0);
  data.forEach((d) => {
    if (d.day_offset >= 0 && d.day_offset < maxBars) {
      filled[d.day_offset] = d.count;
    }
  });

  return (
    <div className="flex items-end gap-[3px] h-24">
      {filled.map((count, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-accent/70 hover:bg-accent transition-colors cursor-default group relative"
          style={{ height: `${Math.max((count / maxCount) * 100, 2)}%` }}
          title={`Jour -${maxBars - 1 - i}: ${count} messages`}
        />
      ))}
    </div>
  );
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    "user.login": "Connexion",
    "user.register": "Inscription",
    "user.role_changed": "Rôle modifié",
    "user.suspended": "Suspendu",
    "user.unsuspended": "Réactivé",
    "user.deleted": "Supprimé",
    "document.deleted": "Doc supprimé",
    "setting.changed": "Paramètre modifié",
    "conversation.deleted": "Conv. supprimée",
    "announcement.created": "Annonce créée",
    "announcement.deleted": "Annonce supprimée",
  };
  return map[action] || action;
}

export function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<ExtendedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExtendedStats()
      .then(setStats)
      .catch(() => toast("Erreur lors du chargement des statistiques", "error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const { totals: t, activity: a } = stats;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-fg">Tableau de bord</h1>
        <p className="text-sm text-fg-secondary mt-0.5">
          Vue d'ensemble de la plateforme ENSET AI
        </p>
      </div>

      {/* Main stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Utilisateurs"
          value={t.total_users}
          colorClass="bg-accent/10"
          icon={<Users className="w-5 h-5 text-accent" />}
        />
        <StatCard
          label="Conversations"
          value={t.total_conversations}
          colorClass="bg-gold/10"
          icon={<MessageSquare className="w-5 h-5 text-gold" />}
        />
        <StatCard
          label="Messages"
          value={t.total_messages}
          colorClass="bg-purple-500/10"
          icon={<BarChart3 className="w-5 h-5 text-purple-500" />}
        />
        <StatCard
          label="Documents"
          value={t.total_documents}
          colorClass="bg-emerald-500/10"
          icon={<FileText className="w-5 h-5 text-emerald-500" />}
        />
        <StatCard
          label="Actifs aujourd'hui"
          value={a.active_users_today}
          colorClass="bg-teal-500/10"
          icon={<UserCheck className="w-5 h-5 text-teal-500" />}
        />
        <StatCard
          label="Suspendus"
          value={t.suspended_users}
          colorClass="bg-red-500/10"
          icon={<Ban className="w-5 h-5 text-red-500" />}
        />
      </div>

      {/* Activity + Chart Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Activity metrics */}
        <div className="bg-surface-1 rounded-2xl border border-hairline shadow-soft p-5">
          <h2 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            Activité récente
          </h2>
          <div className="space-y-3">
            {[
              { label: "Messages aujourd'hui", value: a.messages_today },
              { label: "Messages cette semaine", value: a.messages_this_week },
              { label: "Messages ce mois", value: a.messages_this_month },
              { label: "Nouveaux utilisateurs (7j)", value: a.new_users_this_week },
              { label: "Uploads cette semaine", value: a.uploads_this_week },
              { label: "Documents partagés", value: t.shared_documents },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between items-center py-1.5 border-b border-hairline last:border-0"
              >
                <span className="text-sm text-fg-secondary">{row.label}</span>
                <span className="font-semibold text-fg tabular-nums">
                  {row.value.toLocaleString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily messages chart */}
        <div className="bg-surface-1 rounded-2xl border border-hairline shadow-soft p-5">
          <h2 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            Messages (30 derniers jours)
          </h2>
          <MiniBarChart data={stats.daily_messages} />
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-fg-muted">Il y a 30j</span>
            <span className="text-[10px] text-fg-muted">Aujourd'hui</span>
          </div>
        </div>
      </div>

      {/* Bottom row: Role breakdown, Top users, Provider usage, Recent activity */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Role breakdown */}
        <div className="bg-surface-1 rounded-2xl border border-hairline shadow-soft p-5">
          <h2 className="text-sm font-semibold text-fg mb-3">Rôles</h2>
          <div className="space-y-2">
            {Object.entries(stats.roles_breakdown).map(([role, count]) => (
              <div key={role} className="flex justify-between items-center">
                <span className="text-xs text-fg-secondary capitalize">{role}</span>
                <span className="text-xs font-semibold text-fg tabular-nums bg-surface-3 px-2 py-0.5 rounded-md">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top users */}
        <div className="bg-surface-1 rounded-2xl border border-hairline shadow-soft p-5">
          <h2 className="text-sm font-semibold text-fg mb-3">Top utilisateurs</h2>
          <div className="space-y-2">
            {stats.top_users.length === 0 ? (
              <p className="text-fg-muted text-xs">Pas encore de données</p>
            ) : (
              stats.top_users.map((u, i) => (
                <div key={u.email} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-fg font-medium truncate">{u.name}</p>
                    <p className="text-[10px] text-fg-muted truncate">{u.email}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-fg-secondary tabular-nums">
                    {u.message_count} msgs
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Provider usage */}
        <div className="bg-surface-1 rounded-2xl border border-hairline shadow-soft p-5">
          <h2 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-fg-muted" />
            Providers LLM
          </h2>
          <div className="space-y-2">
            {stats.provider_usage.length === 0 ? (
              <p className="text-fg-muted text-xs">Pas encore de données</p>
            ) : (
              stats.provider_usage.slice(0, 5).map((p) => (
                <div key={`${p.actual_provider}-${p.actual_model}`} className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-fg font-medium">{p.actual_provider}</span>
                    <span className="text-[10px] text-fg-muted ml-1">{p.actual_model?.split("/").pop()?.slice(0, 20)}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-fg-secondary tabular-nums">
                    {p.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-surface-1 rounded-2xl border border-hairline shadow-soft p-5">
          <h2 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-fg-muted" />
            Activité récente
          </h2>
          <div className="space-y-2">
            {stats.recent_activity.length === 0 ? (
              <p className="text-fg-muted text-xs">Aucune activité enregistrée</p>
            ) : (
              stats.recent_activity.map((a, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-fg">{actionLabel(a.action)}</p>
                    <p className="text-[10px] text-fg-muted">
                      {a.user_email || "Système"} ·{" "}
                      {new Date(a.created_at * 1000).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
