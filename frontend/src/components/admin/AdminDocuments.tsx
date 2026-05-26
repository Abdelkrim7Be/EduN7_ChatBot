import { useEffect, useState } from "react";
import type { AdminDocument } from "../../types";
import { fetchAdminDocuments, deleteAdminDocument } from "../../api/client";
import { useToast } from "../ToastProvider";

type ScopeFilter = "all" | "shared" | "private";

const CATEGORY_COLORS: Record<string, string> = {
  "Cours":       "bg-brand-blue/10 text-brand-blue",
  "TD / TP":     "bg-teal-500/10 text-teal-600",
  "Examens":     "bg-brand-gold/10 text-amber-700",
  "Projets":     "bg-purple-500/10 text-purple-600",
  "Corrections": "bg-green-500/10 text-green-600",
  "Autres":      "bg-gray-100 text-gray-500",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function AdminDocuments() {
  const { toast } = useToast();
  const [docs, setDocs] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminDocuments()
      .then(setDocs)
      .catch(() => toast("Erreur lors du chargement des documents", "error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(docId: string) {
    setDeleting(docId);
    try {
      await deleteAdminDocument(docId);
      setDocs((prev) => prev.filter((d) => d.doc_id !== docId));
      toast("Document supprimé", "success");
    } catch {
      toast("Erreur lors de la suppression", "error");
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  const filtered = docs.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.uploader_name.toLowerCase().includes(search.toLowerCase()) ||
      d.uploader_email.toLowerCase().includes(search.toLowerCase());
    const matchScope = scopeFilter === "all" || d.scope === scopeFilter;
    return matchSearch && matchScope;
  });

  const counts = {
    all: docs.length,
    shared: docs.filter((d) => d.scope === "shared").length,
    private: docs.filter((d) => d.scope === "private").length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-navy">Documents</h1>
        <p className="text-sm text-brand-gray-text mt-0.5">
          {docs.length} document{docs.length !== 1 ? "s" : ""} — {counts.shared} partagé{counts.shared !== 1 ? "s" : ""}, {counts.private} privé{counts.private !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-mid" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Nom, auteur ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-brand-gray rounded-lg pl-9 pr-3 py-2 text-sm text-brand-navy placeholder-brand-gray-text focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
        <div className="flex items-center gap-1 bg-brand-surface-muted border border-brand-gray rounded-lg p-1">
          {(["all", "shared", "private"] as ScopeFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setScopeFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                scopeFilter === s
                  ? "bg-white text-brand-navy shadow-sm"
                  : "text-brand-gray-text hover:text-brand-navy"
              }`}
            >
              {s === "all" ? "Tous" : s === "shared" ? "Partagés" : "Privés"}
              {" "}<span className="text-brand-gray-mid">({counts[s]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-brand-gray shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-surface-muted border-b border-brand-gray">
                <th className="text-left px-5 py-3 text-xs font-semibold text-brand-gray-text uppercase tracking-wider">Document</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-brand-gray-text uppercase tracking-wider hidden md:table-cell">Catégorie</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-brand-gray-text uppercase tracking-wider">Scope</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-brand-gray-text uppercase tracking-wider hidden lg:table-cell">Auteur</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-brand-gray-text uppercase tracking-wider hidden md:table-cell">Taille</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-brand-gray-text uppercase tracking-wider hidden lg:table-cell">Ajouté</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray">
              {filtered.map((doc) => (
                <tr key={doc.doc_id} className="hover:bg-brand-surface-muted transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-brand-navy truncate max-w-[200px]" title={doc.name}>{doc.name}</p>
                        <p className="text-xs text-brand-gray-text">{doc.original_filename}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS["Autres"]}`}>
                      {doc.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      doc.scope === "shared"
                        ? "bg-brand-gold/10 text-amber-700 border-amber-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}>
                      {doc.scope === "shared" ? "Partagé" : "Privé"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div>
                      <p className="text-xs font-medium text-brand-navy">{doc.uploader_name}</p>
                      <p className="text-[10px] text-brand-gray-text">{doc.uploader_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-brand-gray-text">
                    {doc.page_count}p · {doc.chunk_count} seg.
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-brand-gray-text">
                    {formatDate(doc.uploaded_at)}
                  </td>
                  <td className="px-4 py-3">
                    {confirmDelete === doc.doc_id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(doc.doc_id)}
                          disabled={deleting === doc.doc_id}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {deleting === doc.doc_id ? "..." : "Confirmer"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs text-brand-gray-text hover:text-brand-navy"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(doc.doc_id)}
                        title="Supprimer"
                        className="opacity-0 group-hover:opacity-100 p-1 text-brand-gray-mid hover:text-red-500 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-brand-gray-text">
                    Aucun document trouvé
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
