import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Ban,
  BarChart3,
  Clock,
  FileText,
  MessageSquare,
  Server,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import type { ExtendedStats } from "../../types";
import { fetchExtendedStats } from "../../api/client";
import { useToast } from "../ToastProvider";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: "normal" | "danger";
}

function StatCard({ label, value, icon, tone = "normal" }: StatCardProps) {
  return (
    <div className="flex min-h-20 items-center gap-3 border border-hairline bg-surface-1 px-4 py-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center border ${
          tone === "danger"
            ? "border-danger/25 bg-danger/10 text-danger"
            : "border-accent/20 bg-accent/10 text-accent"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none text-fg tabular-nums">
          {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
        </p>
        <p className="mt-1.5 text-xs font-medium leading-tight text-fg-secondary">{label}</p>
      </div>
    </div>
  );
}

function MiniBarChart({
  data,
  maxBars = 30,
}: {
  data: { day_offset: number; count: number }[];
  maxBars?: number;
}) {
  const filled = useMemo(() => {
    const values = Array(maxBars).fill(0) as number[];
    data.forEach((d) => {
      if (d.day_offset >= 0 && d.day_offset < maxBars) {
        values[d.day_offset] = d.count;
      }
    });
    return values;
  }, [data, maxBars]);

  const maxCount = Math.max(...filled, 1);
  const total = filled.reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between gap-4">
        <div className="text-[10px] uppercase tracking-widest text-fg-muted">
          <span className="mr-2 text-sm font-bold text-fg tabular-nums">
            {total.toLocaleString("fr-FR")}
          </span>
          Messages sur 30 jours
        </div>
        <div className="text-[10px] uppercase tracking-widest text-fg-muted">
          Pic
          <span className="ml-2 text-sm font-bold text-accent tabular-nums">
            {maxCount.toLocaleString("fr-FR")}
          </span>
        </div>
      </div>

      <div className="relative min-h-24 flex-1 border border-hairline bg-black p-4">
        <div className="pointer-events-none absolute inset-x-4 top-1/4 border-t border-hairline/50" />
        <div className="pointer-events-none absolute inset-x-4 top-1/2 border-t border-hairline/50" />
        <div className="pointer-events-none absolute inset-x-4 top-3/4 border-t border-hairline/50" />
        <div className="relative flex h-full items-end gap-1.5">
          {filled.map((count, i) => {
            const height = count === 0 ? 5 : Math.max((count / maxCount) * 100, 12);
            return (
              <div
                key={i}
                className="flex h-full flex-1 items-end bg-surface-dim"
                title={`Jour -${maxBars - 1 - i}: ${count} messages`}
              >
                <div
                  className={`w-full transition-colors ${
                    count === 0 ? "bg-white/10" : "bg-accent/80 hover:bg-accent"
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-fg-muted">
        <span>Il y a 30j</span>
        <span>Aujourd'hui</span>
      </div>
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
    "document.deleted": "Document supprimé",
    "setting.changed": "Paramètre modifié",
    "conversation.deleted": "Conversation supprimée",
    "announcement.created": "Annonce créée",
    "announcement.deleted": "Annonce supprimée",
    "announcement.toggled": "Annonce modifiée",
    "role.created": "Rôle créé",
    "role.deleted": "Rôle supprimé",
    "role.permissions_changed": "Permissions modifiées",
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
      <div className="flex h-full items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!stats) return null;

  const { totals: t, activity: a } = stats;

  return (
    <div className="h-full overflow-hidden p-5 max-md:h-auto max-md:overflow-y-auto">
      <div className="mx-auto grid h-full max-w-7xl grid-rows-[auto_auto_minmax(0,1.7fr)_minmax(0,0.9fr)] gap-3 max-md:flex max-md:h-auto max-md:flex-col">
        <div>
          <h1 className="text-xl font-bold text-fg">Tableau de bord</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Vue d'ensemble de la plateforme ENSET AI
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <StatCard label="Utilisateurs" value={t.total_users} icon={<Users className="h-5 w-5" />} />
          <StatCard label="Conversations" value={t.total_conversations} icon={<MessageSquare className="h-5 w-5" />} />
          <StatCard label="Messages" value={t.total_messages} icon={<BarChart3 className="h-5 w-5" />} />
          <StatCard label="Documents" value={t.total_documents} icon={<FileText className="h-5 w-5" />} />
          <StatCard label="Actifs aujourd'hui" value={a.active_users_today} icon={<UserCheck className="h-5 w-5" />} />
          <StatCard label="Suspendus" value={t.suspended_users} icon={<Ban className="h-5 w-5" />} tone="danger" />
        </div>

        <div className="grid min-h-0 grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.1fr)] gap-3 max-lg:grid-cols-1 max-md:min-h-[720px]">
          <section className="flex min-h-0 flex-col border border-hairline bg-surface-1 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <TrendingUp className="h-4 w-4 text-accent" />
              Activité récente
            </h2>
            <div className="grid flex-1 content-stretch">
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
                  className="flex items-center justify-between border-b border-hairline px-1 last:border-0"
                >
                  <span className="text-xs text-fg-secondary">{row.label}</span>
                  <span className="text-lg font-bold text-fg tabular-nums">
                    {row.value.toLocaleString("fr-FR")}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-h-0 flex-col border border-hairline bg-surface-1 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <Activity className="h-4 w-4 text-accent" />
              Messages
            </h2>
            <MiniBarChart data={stats.daily_messages} />
          </section>
        </div>

        <div className="grid min-h-0 grid-cols-4 gap-3 max-lg:grid-cols-2 max-md:grid-cols-1">
          <section className="min-h-0 border border-hairline bg-surface-1 p-4">
            <h2 className="mb-3 text-sm font-semibold text-fg">Rôles</h2>
            <div className="space-y-2">
              {Object.entries(stats.roles_breakdown).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-xs capitalize text-fg-secondary">{role}</span>
                  <span className="border border-hairline bg-surface-2 px-2 py-0.5 text-xs font-semibold text-fg tabular-nums">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="min-h-0 border border-hairline bg-surface-1 p-4">
            <h2 className="mb-3 text-sm font-semibold text-fg">Top utilisateurs</h2>
            <div className="space-y-2 overflow-hidden">
              {stats.top_users.length === 0 ? (
                <p className="text-xs text-fg-muted">Pas encore de données</p>
              ) : (
                stats.top_users.slice(0, 3).map((u, i) => (
                  <div key={u.email} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-accent/20 bg-accent/10 text-[10px] font-bold text-accent">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-fg">{u.name}</p>
                      <p className="truncate text-[10px] text-fg-muted">{u.email}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-fg-secondary tabular-nums">
                      {u.message_count} msgs
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="min-h-0 border border-hairline bg-surface-1 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <Server className="h-3.5 w-3.5 text-fg-muted" />
              Providers LLM
            </h2>
            <div className="space-y-2">
              {stats.provider_usage.length === 0 ? (
                <p className="text-xs text-fg-muted">Pas encore de données</p>
              ) : (
                stats.provider_usage.slice(0, 4).map((p) => (
                  <div key={`${p.actual_provider}-${p.actual_model}`} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-fg">{p.actual_provider}</span>
                      <span className="ml-1 text-[10px] text-fg-muted">
                        {p.actual_model?.split("/").pop()?.slice(0, 18)}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-fg-secondary tabular-nums">
                      {p.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="min-h-0 overflow-hidden border border-hairline bg-surface-1 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <Clock className="h-3.5 w-3.5 text-fg-muted" />
              Activité récente
            </h2>
            <div className="h-full min-h-0 space-y-2 overflow-y-auto pb-6 pr-1 custom-scrollbar">
              {stats.recent_activity.length === 0 ? (
                <p className="text-xs text-fg-muted">Aucune activité enregistrée</p>
              ) : (
                stats.recent_activity.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-white" />
                    <div className="min-w-0">
                      <p className="truncate text-xs text-fg">{actionLabel(item.action)}</p>
                      <p className="truncate text-[10px] text-fg-muted">
                        {item.user_email || "Système"} ·{" "}
                        {new Date(item.created_at * 1000).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
