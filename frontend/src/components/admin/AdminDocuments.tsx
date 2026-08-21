import { useEffect, useState } from "react";
import { Search, Trash2, FileText } from "lucide-react";
import type { AdminDocument } from "../../types";
import { fetchAdminDocuments, deleteAdminDocument } from "../../api/client";
import { useToast } from "../ToastProvider";

type ScopeFilter = "all" | "shared" | "private";

const CATEGORY_COLORS: Record<string, string> = {
  "Cours":       "bg-accent/10 text-accent",
  "TD / TP":     "bg-teal-500/10 text-teal-500",
  "Examens":     "bg-gold/10 text-gold",
  "Projets":     "bg-purple-500/10 text-purple-400",
  "Corrections": "bg-success/10 text-success",
  "Autres":      "bg-surface-3 text-fg-muted",
};

function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
    all:     docs.length,
    shared:  docs.filter((d) => d.scope === "shared").length,
    private: docs.filter((d) => d.scope === "private").length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-fg">Documents</h1>
        <p className="text-sm text-fg-secondary mt-0.5">
          {docs.length} document{docs.length !== 1 ? "s" : ""} — {counts.shared}{" "}
          partagé{counts.shared !== 1 ? "s" : ""}, {counts.private} privé{counts.private !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            type="text"
            placeholder="Nom, auteur ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-hairline bg-surface-1 rounded-xl pl-9 pr-3 py-2.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/30 transition-shadow"
          />
        </div>
        <div className="flex items-center gap-1 bg-surface-2 border border-hairline rounded-xl p-1">
          {(["all", "shared", "private"] as ScopeFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setScopeFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                scopeFilter === s
                  ? "bg-surface-1 text-fg shadow-soft"
                  : "text-fg-secondary hover:text-fg"
              }`}
            >
              {s === "all" ? "Tous" : s === "shared" ? "Partagés" : "Privés"}{" "}
              <span className="text-fg-muted">({counts[s]})</span>
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Document</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider hidden md:table-cell">Catégorie</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Scope</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider hidden lg:table-cell">Auteur</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider hidden md:table-cell">Taille</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider hidden lg:table-cell">Ajouté</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.map((doc) => (
                <tr key={doc.doc_id} className="hover:bg-surface-2/40 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-fg truncate max-w-[200px]" title={doc.name}>
                          {doc.name}
                        </p>
                        <p className="text-xs text-fg-muted">{doc.original_filename}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS["Autres"]}`}>
                      {doc.category}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      doc.scope === "shared"
                        ? "bg-gold/10 text-gold border-gold/30"
                        : "bg-surface-3 text-fg-muted border-hairline"
                    }`}>
                      {doc.scope === "shared" ? "Partagé" : "Privé"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <div>
                      <p className="text-xs font-medium text-fg">{doc.uploader_name}</p>
                      <p className="text-[10px] text-fg-muted">{doc.uploader_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell text-xs text-fg-secondary">
                    {doc.page_count}p · {doc.chunk_count} seg.
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-fg-secondary">
                    {formatDate(doc.uploaded_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    {confirmDelete === doc.doc_id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(doc.doc_id)}
                          disabled={deleting === doc.doc_id}
                          className="text-xs font-semibold text-danger hover:text-danger/80 disabled:opacity-50"
                        >
                          {deleting === doc.doc_id ? "..." : "Confirmer"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs text-fg-secondary hover:text-fg"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(doc.doc_id)}
                        title="Supprimer"
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-fg-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-fg-muted">
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
