import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Ban,
  BarChart3,
  Clock,
  FileText,
  MessageCircle,
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
          {typeof value === "number" ? value.toLocaleString("en-US") : value}
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
            {total.toLocaleString("en-US")}
          </span>
          Messages over 30 days
        </div>
        <div className="text-[10px] uppercase tracking-widest text-fg-muted">
          Peak
          <span className="ml-2 text-sm font-bold text-accent tabular-nums">
            {maxCount.toLocaleString("en-US")}
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
                title={`Day -${maxBars - 1 - i}: ${count} messages`}
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
        <span>30 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    "user.login": "Login",
    "user.register": "Registration",
    "user.role_changed": "Role changed",
    "user.suspended": "Suspended",
    "user.unsuspended": "Reactivated",
    "user.deleted": "User deleted",
    "document.deleted": "Document deleted",
    "setting.changed": "Setting changed",
    "conversation.deleted": "Conversation deleted",
    "announcement.created": "Announcement created",
    "announcement.deleted": "Announcement deleted",
    "announcement.toggled": "Announcement updated",
    "role.created": "Role created",
    "role.deleted": "Role deleted",
    "role.permissions_changed": "Permissions changed",
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
      .catch(() => toast("Failed to load statistics", "error"))
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
    <div className="min-h-full overflow-y-auto p-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <div>
          <h1 className="text-xl font-bold text-fg">Dashboard</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            ENSET AI platform overview
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
          <StatCard label="Users" value={t.total_users} icon={<Users className="h-5 w-5" />} />
          <StatCard label="Conversations" value={t.total_conversations} icon={<MessageSquare className="h-5 w-5" />} />
          <StatCard label="Messages" value={t.total_messages} icon={<BarChart3 className="h-5 w-5" />} />
          <StatCard label="Documents" value={t.total_documents} icon={<FileText className="h-5 w-5" />} />
          <StatCard label="Active Today" value={a.active_users_today} icon={<UserCheck className="h-5 w-5" />} />
          <StatCard label="Suspended" value={t.suspended_users} icon={<Ban className="h-5 w-5" />} tone="danger" />
          <StatCard label="Public Assistant" value={stats.public_assistant.requests_today ?? 0} icon={<MessageCircle className="h-5 w-5" />} />
        </div>

        <div className="grid grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.1fr)] gap-3 max-lg:grid-cols-1">
          <section className="flex min-h-80 flex-col border border-hairline bg-surface-1 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <TrendingUp className="h-4 w-4 text-accent" />
              Recent Activity
            </h2>
            <div className="grid flex-1 content-stretch">
              {[
                { label: "Messages today", value: a.messages_today },
                { label: "Messages this week", value: a.messages_this_week },
                { label: "Messages this month", value: a.messages_this_month },
                { label: "New users (7d)", value: a.new_users_this_week },
                { label: "Uploads this week", value: a.uploads_this_week },
                { label: "Shared documents", value: t.shared_documents },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border-b border-hairline px-1 last:border-0"
                >
                  <span className="text-xs text-fg-secondary">{row.label}</span>
                  <span className="text-lg font-bold text-fg tabular-nums">
                    {row.value.toLocaleString("en-US")}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-h-80 flex-col border border-hairline bg-surface-1 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <Activity className="h-4 w-4 text-accent" />
              Messages
            </h2>
            <MiniBarChart data={stats.daily_messages} />
          </section>
        </div>

        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-5">
          <section className="min-h-44 border border-hairline bg-surface-1 p-4">
            <h2 className="mb-3 text-sm font-semibold text-fg">Roles</h2>
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

          <section className="min-h-44 border border-hairline bg-surface-1 p-4">
            <h2 className="mb-3 text-sm font-semibold text-fg">Top Users</h2>
            <div className="space-y-2 overflow-hidden">
              {stats.top_users.length === 0 ? (
                <p className="text-xs text-fg-muted">No data yet</p>
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

          <section className="min-h-44 border border-hairline bg-surface-1 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <Server className="h-3.5 w-3.5 text-fg-muted" />
              LLM Providers
            </h2>
            <div className="space-y-2">
              {stats.provider_usage.length === 0 ? (
                <p className="text-xs text-fg-muted">No data yet</p>
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

          <section className="min-h-44 overflow-hidden border border-hairline bg-surface-1 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <Clock className="h-3.5 w-3.5 text-fg-muted" />
              Recent Activity
            </h2>
            <div className="max-h-36 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {stats.recent_activity.length === 0 ? (
                <p className="text-xs text-fg-muted">No activity recorded</p>
              ) : (
                stats.recent_activity.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-white" />
                    <div className="min-w-0">
                      <p className="truncate text-xs text-fg">{actionLabel(item.action)}</p>
                      <p className="truncate text-[10px] text-fg-muted">
                        {item.user_email || "System"} ·{" "}
                        {new Date(item.created_at * 1000).toLocaleTimeString("en-US", {
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

          <section className="min-h-44 border border-hairline bg-surface-1 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <MessageCircle className="h-3.5 w-3.5 text-fg-muted" />
              Public Assistant
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-secondary">Total</span>
                <span className="text-xs font-semibold text-fg tabular-nums">
                  {(stats.public_assistant.total_requests ?? 0).toLocaleString("en-US")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-secondary">Failures</span>
                <span className="text-xs font-semibold text-fg tabular-nums">
                  {(stats.public_assistant.failed_requests ?? 0).toLocaleString("en-US")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-secondary">Avg. latency</span>
                <span className="text-xs font-semibold text-fg tabular-nums">
                  {stats.public_assistant.avg_latency_ms
                    ? `${Math.round(stats.public_assistant.avg_latency_ms)} ms`
                    : "—"}
                </span>
              </div>
              <div className="pt-1">
                {stats.public_assistant.outcomes.length === 0 ? (
                  <p className="text-xs text-fg-muted">No data yet</p>
                ) : (
                  stats.public_assistant.outcomes.slice(0, 3).map((row) => (
                    <div key={row.outcome} className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest text-fg-muted">{row.outcome}</span>
                      <span className="text-[10px] font-semibold text-fg-secondary tabular-nums">{row.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
