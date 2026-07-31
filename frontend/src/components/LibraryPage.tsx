import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import type { AdminDocument, User } from "../types";
import { fetchAdminDocuments, deleteAdminDocument } from "../api/client";
import { useToast } from "./ToastProvider";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { useDocuments } from "../hooks/useDocuments";

const CATEGORY_COLORS: Record<string, string> = {
  Cours: "bg-white/10 text-white",
  "TD / TP": "bg-white/10 text-white",
  Examens: "bg-white/10 text-white",
  Projets: "bg-white/10 text-white",
  Corrections: "bg-white/10 text-white",
  Autres: "bg-white/10 text-white",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [preview, setPreview] = useState<{
    docId: string;
    name: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading } = useDocuments("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) {
      await upload(files, "shared");
      // Refetch documents after upload
      fetchAdminDocuments("shared")
        .then(setDocs)
        .catch(() => toast("Erreur lors du chargement de la bibliothèque", "error"));
    }
    e.target.value = "";
  }

  useEffect(() => {
    fetchAdminDocuments("shared")
      .then(setDocs)
      .catch(() => toast("Erreur lors du chargement de la bibliothèque", "error"))
      .finally(() => setLoading(false));
  }, []);

  const canDelete = (doc: AdminDocument) => isRole("admin") || doc.uploader_email === user.email;

  async function handleDelete(docId: string) {
    setDeleting(docId);
    try {
      await deleteAdminDocument(docId);
      setDocs((prev) => prev.filter((d) => d.doc_id !== docId));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
      toast("Document removed from library", "success");
    } catch {
      toast("Erreur lors de la suppression", "error");
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    const ids = [...selected];
    let failed = 0;
    for (const id of ids) {
      try {
        await deleteAdminDocument(id);
        setDocs((prev) => prev.filter((d) => d.doc_id !== id));
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch {
        failed++;
      }
    }
    setBulkDeleting(false);
    setConfirmBulk(false);
    if (failed === 0)
      toast(`${ids.length} document${ids.length > 1 ? "s" : ""} deleted`, "success");
    else
      toast(`${ids.length - failed} deleted, ${failed} error(s)`, "error");
  }

  const filtered = docs.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.uploader_name.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase())
  );

  const deletableFiltered = filtered.filter(canDelete);
  const allSelected = deletableFiltered.length > 0 && deletableFiltered.every((d) => selected.has(d.doc_id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        deletableFiltered.forEach((d) => next.delete(d.doc_id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        deletableFiltered.forEach((d) => next.add(d.doc_id));
        return next;
      });
    }
  }

  function toggleSelect(docId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(docId) ? next.delete(docId) : next.add(docId);
      return next;
    });
  }

  const selectedCount = selected.size;

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-x-black text-x-white font-mono p-6">
        <div className="max-w-6xl mx-auto py-10">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors border border-transparent hover:border-white/20 py-2 px-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              Return to Chat
            </Link>
          </div>
          
          {/* Alert Section */}
          <div className="border border-white/20 p-4 mb-10 flex items-start gap-4 text-sm text-white/70 leading-relaxed bg-white/5 transition-colors hover:border-white">
            <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p>
              Shared documents are automatically available in the side panel of the <Link to="/" className="text-white underline underline-offset-4 decoration-white/30 hover:decoration-white">Chat</Link>.
              Select them in the "Documents" section to query them.
            </p>
          </div>

          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                <h1 className="text-3xl font-bold tracking-tight uppercase">Shared Library</h1>
              </div>
              <p className="text-white/50 text-sm">{docs.length} documents published and accessible to all</p>
            </div>
            {selectedCount > 0 ? (
              <div className="flex items-center gap-4">
                <span className="text-xs uppercase tracking-widest text-white/50">{selectedCount} selected</span>
                {confirmBulk ? (
                  <>
                    <button onClick={handleBulkDelete} disabled={bulkDeleting} className="bg-red-600 text-white px-6 py-2 font-bold uppercase tracking-widest hover:bg-red-700 transition-all text-xs disabled:opacity-50">
                      {bulkDeleting ? "Deleting..." : "Confirm"}
                    </button>
                    <button onClick={() => setConfirmBulk(false)} className="border border-white/40 text-white px-4 py-2 font-bold uppercase tracking-widest hover:bg-white/10 transition-all text-xs">
                      Cancel
                    </button>
                  </>
                ) : (
                  <button onClick={() => setConfirmBulk(true)} className="border border-red-500/50 text-red-500 px-6 py-2 font-bold uppercase tracking-widest hover:bg-red-500/10 transition-all text-xs">
                    Delete Selected
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button onClick={() => { setLoading(true); fetchAdminDocuments("shared").then(setDocs).finally(() => setLoading(false)); }} className="border border-white/40 text-white px-6 py-3 font-bold uppercase tracking-widest hover:bg-white/10 transition-all text-sm">
                  Refresh
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-white text-black px-8 py-3 font-bold uppercase tracking-widest hover:bg-white/90 transition-all text-sm disabled:opacity-50">
                  {isUploading ? "Uploading..." : "Upload Document"}
                </button>
              </div>
            )}
          </div>

          {/* Table Filters */}
          <div className="flex items-center gap-4 mb-6">
            {deletableFiltered.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 border border-white/20 bg-white/5 hover:border-white transition-colors">
                <input 
                  type="checkbox" 
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  id="selectAll" 
                  className="appearance-none cursor-pointer w-4 h-4 border border-white/30 rounded-sm bg-transparent checked:bg-white checked:border-white relative flex-shrink-0 after:content-[''] checked:after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-black after:text-[12px] after:font-bold after:leading-none transition-colors"
                />
                <label htmlFor="selectAll" className="text-[10px] uppercase font-bold text-white/50 cursor-pointer select-none">
                  Select All
                </label>
              </div>
            )}
            <div className="flex-grow relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="SEARCH BY NAME, AUTHOR OR CATEGORY..." 
                className="w-full bg-transparent border border-white/20 py-2.5 pl-12 pr-4 text-xs uppercase tracking-widest focus:border-white focus:ring-0 placeholder:text-white/30 transition-colors" 
              />
            </div>
          </div>

          {/* Document Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-white/50 text-sm uppercase tracking-widest animate-pulse">Loading...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="border border-white/20 bg-white/5 p-12 text-center flex flex-col items-center">
               <svg className="w-8 h-8 text-white/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path>
                </svg>
                <p className="text-sm font-bold uppercase tracking-widest text-white/70">Library empty</p>
                <p className="text-xs text-white/40 mt-2 max-w-sm uppercase tracking-wider leading-relaxed">
                  {search ? "No results found." : "No shared documents at the moment."}
                </p>
            </div>
          ) : (
            <div className="grid gap-px bg-white/10 border border-white/20 overflow-hidden">
              {filtered.map((doc) => (
                <div key={doc.doc_id} className={`group bg-black p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-transparent hover:border-white transition-all duration-200 ${selected.has(doc.doc_id) ? "bg-[#111111] border-white/40" : ""}`}>
                  <div className="flex items-center gap-4 flex-grow min-w-0">
                    {canDelete(doc) && (
                      <input 
                        type="checkbox" 
                        checked={selected.has(doc.doc_id)}
                        onChange={() => toggleSelect(doc.doc_id)}
                        className="appearance-none cursor-pointer w-4 h-4 border border-white/30 rounded-sm bg-transparent checked:bg-white checked:border-white relative flex-shrink-0 after:content-[''] checked:after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-black after:text-[12px] after:font-bold after:leading-none transition-colors"
                      />
                    )}
                    <div className="p-3 bg-white/5 border border-white/10 group-hover:border-white/40 transition-colors flex-shrink-0 cursor-pointer" onClick={() => setPreview({ docId: doc.doc_id, name: doc.name })}>
                      <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg leading-tight mb-1 truncate text-white" title={doc.name}>
                        {doc.name}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-white/50 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5 truncate max-w-[150px]">
                          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08s5.97 1.09 6 3.08c-1.29 1.94-3.5 3.22-6 3.22z"></path>
                          </svg> 
                          {doc.uploader_name}
                        </span>
                        <span>{doc.page_count} pages · {doc.chunk_count} segments</span>
                        <span>{formatDate(doc.uploaded_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className={`px-3 py-1 border border-white/10 text-[10px] uppercase font-bold tracking-widest ${CATEGORY_COLORS[doc.category] || CATEGORY_COLORS["Autres"]}`}>
                      {doc.category}
                    </span>
                    {canDelete(doc) && (
                      confirmDelete === doc.doc_id ? (
                        <div className="flex items-center gap-2">
                           <button onClick={() => handleDelete(doc.doc_id)} disabled={deleting === doc.doc_id} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400">
                             {deleting === doc.doc_id ? "..." : "OUI"}
                           </button>
                           <button onClick={() => setConfirmDelete(null)} className="text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white">
                             NON
                           </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(doc.doc_id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-500" title="Supprimer">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path>
                          </svg>
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <DocumentPreviewModal
          docId={preview.docId}
          docName={preview.name}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
