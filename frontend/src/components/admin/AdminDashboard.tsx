import { useEffect, useState } from "react";
import type { AdminStats } from "../../types";
import { fetchAdminStats } from "../../api/client";
import { useToast } from "../ToastProvider";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}

function StatCard({ label, value, icon, color, sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-brand-gray shadow-sm flex items-center gap-4">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-brand-navy">
          {value.toLocaleString("fr-FR")}
        </p>
        <p className="text-xs text-brand-gray-text font-medium">{label}</p>
        {sub && <p className="text-[10px] text-brand-gray-mid mt-0.5">{sub}</p>}
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
        <h1 className="text-xl font-bold text-brand-navy">Tableau de bord</h1>
        <p className="text-sm text-brand-gray-text mt-0.5">
          Vue d'ensemble de la plateforme ENSET AI
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              label="Utilisateurs"
              value={stats.user_count}
              color="bg-brand-blue/10"
              icon={
                <svg
                  className="w-5 h-5 text-brand-blue"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              }
            />
            <StatCard
              label="Conversations"
              value={stats.conversation_count}
              color="bg-brand-gold/10"
              icon={
                <svg
                  className="w-5 h-5 text-brand-gold"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              }
            />
            <StatCard
              label="Messages"
              value={stats.message_count}
              color="bg-purple-500/10"
              icon={
                <svg
                  className="w-5 h-5 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
              }
            />
            <StatCard
              label="Documents"
              value={stats.document_count}
              color="bg-green-500/10"
              icon={
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
            />
            <StatCard
              label="Docs partagés"
              value={stats.shared_doc_count}
              color="bg-teal-500/10"
              sub={
                stats.document_count > 0
                  ? `${Math.round((stats.shared_doc_count / stats.document_count) * 100)}% du total`
                  : undefined
              }
              icon={
                <svg
                  className="w-5 h-5 text-teal-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              }
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-brand-gray shadow-sm p-5">
              <h2 className="text-sm font-semibold text-brand-navy mb-3">
                Activité
              </h2>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-brand-gray-text">
                    Msgs / conversation (moy.)
                  </span>
                  <span className="font-semibold text-brand-navy">
                    {stats.conversation_count > 0
                      ? Math.round(
                          stats.message_count / stats.conversation_count,
                        )
                      : 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-gray-text">
                    Docs / utilisateur (moy.)
                  </span>
                  <span className="font-semibold text-brand-navy">
                    {stats.user_count > 0
                      ? Math.round(
                          (stats.document_count / stats.user_count) * 10,
                        ) / 10
                      : 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-gray-text">
                    Documents partagés
                  </span>
                  <span className="font-semibold text-brand-navy">
                    {stats.shared_doc_count}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-brand-gray shadow-sm p-5">
              <h2 className="text-sm font-semibold text-brand-navy mb-3">
                Actions rapides
              </h2>
              <div className="space-y-2">
                <a
                  href="/admin/users"
                  className="flex items-center gap-2 text-sm text-brand-blue hover:underline"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  Gérer les utilisateurs
                </a>
                <a
                  href="/admin/documents"
                  className="flex items-center gap-2 text-sm text-brand-blue hover:underline"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  Voir tous les documents
                </a>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
