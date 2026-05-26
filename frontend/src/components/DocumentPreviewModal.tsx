import { useEffect, useState } from "react";
import { fetchDocumentPreview } from "../api/client";

interface Props {
  docId: string;
  docName: string;
  onClose: () => void;
}

export function DocumentPreviewModal({ docId, docName, onClose }: Props) {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchDocumentPreview(docId, page)
      .then((data) => {
        setText(data.text);
        setTotalPages(data.total_pages);
      })
      .catch(() => setError("Impossible de charger la prévisualisation."))
      .finally(() => setLoading(false));
  }, [docId, page]);

  function prev() {
    setPage((p) => Math.max(1, p - 1));
  }
  function next() {
    setPage((p) => Math.min(totalPages, p + 1));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-brand-gray flex-shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-navy truncate">{docName}</p>
            <p className="text-xs text-brand-gray-text mt-0.5">
              Prévisualisation du texte extrait
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 p-1.5 text-brand-gray-mid hover:text-brand-navy hover:bg-brand-surface-muted rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-brand-navy">Prévisualisation indisponible</p>
              <p className="text-xs text-brand-gray-text mt-1">{error}</p>
            </div>
          ) : text.trim() === "" ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-brand-navy">Page vide</p>
              <p className="text-xs text-brand-gray-text mt-1">
                Aucun texte extrait sur cette page (image ou page blanche).
              </p>
            </div>
          ) : (
            <pre className="text-xs text-brand-navy font-mono leading-relaxed whitespace-pre-wrap break-words bg-brand-surface-muted rounded-xl p-4 border border-brand-gray">
              {text}
            </pre>
          )}
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-brand-gray flex-shrink-0 bg-white">
          <button
            onClick={prev}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-gray-text hover:text-brand-navy hover:bg-brand-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Précédente
          </button>

          <span className="text-xs text-brand-gray-text font-medium">
            Page <span className="text-brand-navy font-semibold">{page}</span> / {totalPages}
          </span>

          <button
            onClick={next}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-gray-text hover:text-brand-navy hover:bg-brand-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Suivante
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
