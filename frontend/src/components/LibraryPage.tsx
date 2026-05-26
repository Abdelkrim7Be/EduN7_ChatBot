import { useEffect, useState } from "react";
import type { AdminDocument, User } from "../types";
import { fetchAdminDocuments, deleteAdminDocument } from "../api/client";
import { useToast } from "./ToastProvider";

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

interface Props {
  user: User;
  isRole: (...roles: User["role"][]) => boolean;
}

export function LibraryPage({ user, isRole }: Props) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminDocuments("shared")
      .then(setDocs)
      .catch(() => toast("Erreur lors du chargement de la bibliothèque", "error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(docId: string) {
    setDeleting(docId);
    try {
      await deleteAdminDocument(docId);
      setDocs((prev) => prev.filter((d) => d.doc_id !== docId));
      toast("Document supprimé de la bibliothèque", "success");
    } catch {
      toast("Erreur lors de la suppression", "error");
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  const filtered = docs.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.uploader_name.toLowerCase().includes(search.toLowerCase()) ||
    d.category.toLowerCase().includes(search.toLowerCase())
  );

  const canDelete = (doc: AdminDocument) =>
    isRole("admin") || doc.uploader_email === user.email;

  return (
    <div className="flex-1 overflow-y-auto bg-brand-surface-muted p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-navy flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
              Bibliothèque partagée
            </h1>
            <p className="text-sm text-brand-gray-text mt-0.5">
              {docs.length} document{docs.length !== 1 ? "s" : ""} publiés et accessibles à tous les étudiants
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-mid" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom, auteur ou catégorie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-brand-gray rounded-xl pl-9 pr-3 py-2.5 text-sm text-brand-navy placeholder-brand-gray-text focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white shadow-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-surface-muted border border-brand-gray flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-brand-gray-mid" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-brand-navy">Bibliothèque vide</p>
            <p className="text-xs text-brand-gray-text mt-1 max-w-xs">
              {search ? "Aucun résultat pour cette recherche." : "Aucun document partagé pour le moment. Uploadez des PDFs avec le scope « Partagé avec tous » pour les publier ici."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((doc) => (
              <div
                key={doc.doc_id}
                className="bg-white rounded-xl border border-brand-gray shadow-sm p-4 flex items-start gap-4 group hover:shadow-md transition-shadow"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-navy truncate" title={doc.name}>{doc.name}</p>
                      <p className="text-xs text-brand-gray-text mt-0.5">{doc.original_filename}</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS["Autres"]}`}>
                      {doc.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs text-brand-gray-text">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {doc.uploader_name}
                    </span>
                    <span>{doc.page_count} pages · {doc.chunk_count} segments</span>
                    <span>{formatDate(doc.uploaded_at)}</span>
                  </div>
                </div>

                {/* Delete action */}
                {canDelete(doc) && (
                  <div className="flex-shrink-0">
                    {confirmDelete === doc.doc_id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(doc.doc_id)}
                          disabled={deleting === doc.doc_id}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {deleting === doc.doc_id ? "..." : "Supprimer"}
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
                        title="Retirer de la bibliothèque"
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-brand-gray-mid hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
