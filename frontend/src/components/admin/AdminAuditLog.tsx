import { useCallback, useEffect, useState } from "react";
import { Search, ClipboardList, RefreshCw } from "lucide-react";
import { fetchAuditLog } from "../../api/client";
import { useToast } from "../ToastProvider";
import type { AuditLogEntry } from "../../types";
import { AdminPagination } from "./AdminPagination";

const PAGE_SIZE = 10;

function actionBadgeColor(action: string): string {
  if (action.startsWith("user.")) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (action.startsWith("document.")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (action.startsWith("conversation.")) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (action.startsWith("setting.")) return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  if (action.startsWith("announcement.")) return "bg-teal-500/10 text-teal-400 border-teal-500/20";
  return "bg-gray-500/10 text-gray-400 border-gray-500/20";
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AdminAuditLog() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback((nextPage: number, actionQuery: string) => {
    setLoading(true);
    fetchAuditLog({
      action: actionQuery || undefined,
      limit: PAGE_SIZE,
      offset: (nextPage - 1) * PAGE_SIZE,
    })
      .then(({ logs: l, total: t }) => {
        setLogs(l);
        setTotal(t);
      })
      .catch(() => toast("Erreur lors du chargement du journal", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    load(1, "");
  }, [load]);

  function handleSearch() {
    setPage(1);
    load(1, search);
  }

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
    load(nextPage, search);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-fg">Journal d'audit</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            {total} événement{total !== 1 ? "s" : ""} enregistré{total !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => {
            setPage(1);
            load(1, search);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface-1 border border-hairline rounded-lg hover:bg-surface-3 text-fg-secondary transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
          <input
            type="text"
            placeholder="Filtrer par action (ex: user.login, document.deleted...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full bg-surface-1 border border-hairline rounded-xl pl-9 pr-4 py-2.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-accent text-accent-contrast text-sm font-medium rounded-xl hover:bg-accent-hover transition-colors"
        >
          Filtrer
        </button>
      </div>

      <AdminPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        loading={loading}
        onPageChange={handlePageChange}
      />

      {/* Table */}
      <div className="bg-surface-1 rounded-2xl border border-hairline shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Utilisateur</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Cible</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Détails</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-2/50 transition-colors">
                  <td className="px-4 py-3 text-fg-secondary text-xs whitespace-nowrap">
                    {formatTime(log.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-fg text-xs font-medium">{log.user_name || "—"}</div>
                    <div className="text-fg-muted text-[10px]">{log.user_email || ""}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${actionBadgeColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-fg-secondary text-xs">
                    {log.target_type ? (
                      <span>
                        {log.target_type}
                        {log.target_id && <span className="text-fg-muted ml-1">#{log.target_id.slice(0, 8)}</span>}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-fg-secondary text-xs max-w-[200px] truncate">
                    {log.details || "—"}
                  </td>
                  <td className="px-4 py-3 text-fg-muted text-xs font-mono">
                    {log.ip_address || "—"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <ClipboardList className="w-8 h-8 text-fg-muted mx-auto mb-2" />
                    <p className="text-fg-muted text-sm">Aucun événement trouvé</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          loading={loading}
          onPageChange={handlePageChange}
        />
      </div>

      {loading && logs.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
