import { useEffect, useState } from "react";
import { fetchDocumentFile } from "../api/client";

interface Props {
  docId: string;
  docName: string;
  onClose: () => void;
  loadFile?: (docId: string) => Promise<string>;
}

export function DocumentPreviewModal({ docId, docName, onClose, loadFile = fetchDocumentFile }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    loadFile(docId)
      .then((url) => {
        objectUrl = url;
        setPdfUrl(url);
      })
      .catch(() => setError("Unable to load document preview."))
      .finally(() => setLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docId, loadFile]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-black border border-white/20 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 flex-shrink-0">
          <div className="min-w-0 flex items-center gap-4">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-widest truncate">
                {docName}
              </p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest mt-0.5">
                Document Preview
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/20"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#111111] overflow-hidden relative">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
              <p className="text-xs text-white/50 uppercase tracking-widest">Chargement du document...</p>
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-8">
              <svg className="w-12 h-12 text-red-500/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <p className="text-sm font-bold text-white uppercase tracking-widest">
                Preview Unavailable
              </p>
              <p className="text-xs text-white/50 mt-2 max-w-sm uppercase tracking-wider">{error}</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-none"
              title={docName}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
