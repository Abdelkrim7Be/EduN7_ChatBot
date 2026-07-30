import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, MessageSquare, FileText, Share2, Activity, ArrowRight } from "lucide-react";
import type { AdminStats } from "../../types";
import { fetchAdminStats } from "../../api/client";
import { useToast } from "../ToastProvider";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  sub?: string;
}

function StatCard({ label, value, icon, colorClass, sub }: StatCardProps) {
  return (
    <div className="bg-surface-1 rounded-2xl p-5 border border-hairline shadow-soft flex items-center gap-4 hover:shadow-elevated transition-shadow duration-200">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-fg tabular-nums">
          {value.toLocaleString("fr-FR")}
        </p>
        <p className="text-xs text-fg-secondary font-medium">{label}</p>
        {sub && <p className="text-[10px] text-fg-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch(() => toast("Erreur lors du chargement des stats", "error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-fg">Tableau de bord</h1>
        <p className="text-sm text-fg-secondary mt-0.5">
          Vue d'ensemble de la plateforme ENSET AI
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              label="Utilisateurs"
              value={stats.user_count}
              colorClass="bg-accent/10"
              icon={<Users className="w-5 h-5 text-accent" />}
            />
            <StatCard
              label="Conversations"
              value={stats.conversation_count}
              colorClass="bg-gold/10"
              icon={<MessageSquare className="w-5 h-5 text-gold" />}
            />
            <StatCard
              label="Messages"
              value={stats.message_count}
              colorClass="bg-purple-500/10"
              icon={
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              }
            />
            <StatCard
              label="Documents"
              value={stats.document_count}
              colorClass="bg-success/10"
              icon={<FileText className="w-5 h-5 text-success" />}
            />
            <StatCard
              label="Docs partagés"
              value={stats.shared_doc_count}
              colorClass="bg-teal-500/10"
              sub={
                stats.document_count > 0
                  ? `${Math.round((stats.shared_doc_count / stats.document_count) * 100)}% du total`
                  : undefined
              }
              icon={<Share2 className="w-5 h-5 text-teal-500" />}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-surface-1 rounded-2xl border border-hairline shadow-soft p-5">
              <h2 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                Activité
              </h2>
              <div className="space-y-3">
                {[
                  {
                    label: "Msgs / conversation (moy.)",
                    value: stats.conversation_count > 0
                      ? Math.round(stats.message_count / stats.conversation_count)
                      : 0,
                  },
                  {
                    label: "Docs / utilisateur (moy.)",
                    value: stats.user_count > 0
                      ? Math.round((stats.document_count / stats.user_count) * 10) / 10
                      : 0,
                  },
                  {
                    label: "Documents partagés",
                    value: stats.shared_doc_count,
                  },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-hairline last:border-0">
                    <span className="text-sm text-fg-secondary">{row.label}</span>
                    <span className="font-semibold text-fg tabular-nums">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-1 rounded-2xl border border-hairline shadow-soft p-5">
              <h2 className="text-sm font-semibold text-fg mb-4">Actions rapides</h2>
              <div className="space-y-2">
                {[
                  { to: "/admin/users", label: "Gérer les utilisateurs" },
                  { to: "/admin/documents", label: "Voir tous les documents" },
                  { to: "/admin/conversations", label: "Superviser les conversations" },
                  { to: "/admin/settings", label: "Paramètres de la plateforme" },
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover group transition-colors py-1"
                  >
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
