import { FileText, CheckSquare, Square, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import type { DocumentRecord } from "../types";

interface Props {
  documents: DocumentRecord[];
  selectedDocIds: Set<string>;
  onToggleDoc: (id: string) => void;
  onDeleteDoc: (id: string) => void;
  onAddMore?: () => void;
  onSetSelection?: (ids: string[]) => void;
  collapsed?: boolean;
  onCollapseToggle?: () => void;
}

export function LibrarySidebar({
  documents,
  selectedDocIds,
  onToggleDoc,
  onDeleteDoc,
  onAddMore,
  onSetSelection,
  collapsed,
  onCollapseToggle,
}: Props) {
  const { user, isRole } = useAuth();
  const [previewDoc, setPreviewDoc] = useState<{ id: string; name: string } | null>(null);

  const sharedDocs = documents.filter((d) => d.scope === "shared");
  const privateDocs = documents.filter((d) => d.scope === "private");

  const allDocIds = documents.map((d) => d.doc_id);
  const allSelected = allDocIds.length > 0 && selectedDocIds.size === allDocIds.length;

  if (collapsed) {
    return (
      <div className="w-16 h-full bg-[#0e0e0e] border-l border-border-subtle flex flex-col items-center py-4 z-20 relative font-mono">
        <button
          onClick={onCollapseToggle}
          className="p-2 text-gray-500 hover:text-white rounded-sm hover:bg-surface-dim transition-colors mb-4"
          title="Open Library"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <button
          onClick={onAddMore}
          className="p-2 text-gray-500 hover:text-white rounded-sm hover:bg-surface-dim transition-colors"
          title="Add Document"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>
    );
  }

  const handleToggleAll = () => {
    if (!onSetSelection) return;
    if (allSelected) {
      onSetSelection([]);
    } else {
      onSetSelection(allDocIds);
    }
  };

  const renderDocGroup = (docs: DocumentRecord[], title: string) => {
    if (docs.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">{title}</div>
        <div className="space-y-3">
          {docs.map((doc) => {
            const selected = selectedDocIds.has(doc.doc_id);
            return (
              <div key={doc.doc_id} className={`p-3 border transition-colors group cursor-pointer ${
                selected ? "border-white bg-white/5" : "border-border-subtle bg-transparent hover:border-gray-500"
              }`} onClick={() => onToggleDoc(doc.doc_id)}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {selected ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs truncate ${selected ? "text-white font-bold" : "text-gray-400"}`}>
                      {doc.name}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewDoc({ id: doc.doc_id, name: doc.name });
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-white transition-all"
                    title="View PDF"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {(doc.scope !== "shared" || doc.user_id === user?.id || isRole("admin")) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDoc(doc.doc_id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside className="w-80 border-l border-border-subtle flex flex-col h-full bg-[#0e0e0e] shrink-0 z-20 font-mono">
      <div className="p-4 border-b border-border-subtle flex justify-between items-center">
        <div className="text-xs font-bold uppercase tracking-widest text-white">Reference Materials</div>
        <div className="flex items-center gap-2">
          {documents.length > 0 && onSetSelection && (
            <button
              onClick={handleToggleAll}
              className="text-[10px] text-gray-400 hover:text-white uppercase tracking-widest"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          )}
          {onCollapseToggle && (
            <button onClick={onCollapseToggle} className="text-gray-500 hover:text-white transition-colors">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {documents.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 border border-border-subtle rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-4 h-4 text-gray-500" />
              </div>
              <p className="text-xs text-gray-500">No documents attached.</p>
            </div>
        ) : (
            <div>
              {renderDocGroup(privateDocs, "Personal Documents")}
              {renderDocGroup(sharedDocs, "Shared Documents")}
            </div>
        )}
      </div>

      <div className="p-4 border-t border-border-subtle">
        <button
          onClick={onAddMore}
          className="w-full py-2 border border-border-heavy text-xs text-white uppercase tracking-widest hover:bg-white hover:text-black transition-all"
        >
          Add Document
        </button>
      </div>

      {previewDoc && (
        <DocumentPreviewModal
          docId={previewDoc.id}
          docName={previewDoc.name}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </aside>
  );
}
