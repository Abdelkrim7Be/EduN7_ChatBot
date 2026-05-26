import { useState, useCallback } from "react";
import type { DocumentRecord } from "../types";
import {
  uploadDocuments,
  deleteDocument,
  listDocuments,
  fetchDocumentStatus,
} from "../api/client";

export type UploadStage =
  | "uploading"
  | "extracting"
  | "chunking"
  | "embedding"
  | "done"
  | null;

// Backend status → frontend stage label
const STATUS_STAGE: Record<string, UploadStage> = {
  uploading: "uploading",
  parsing:   "extracting",
  chunking:  "chunking",
  embedding: "embedding",
  ready:     "done",
};

const STAGE_ORDER: NonNullable<UploadStage>[] = [
  "uploading",
  "extracting",
  "chunking",
  "embedding",
  "done",
];

async function pollUntilReady(
  docIds: string[],
  onStage: (s: UploadStage) => void,
): Promise<void> {
  while (true) {
    const statuses = await Promise.all(docIds.map((id) => fetchDocumentStatus(id)));

    const anyFailed = statuses.find((s) => s.status === "failed");
    if (anyFailed) {
      throw new Error(anyFailed.error_message ?? "Processing failed");
    }

    // Show the stage of whichever doc is furthest behind
    const stages = statuses.map((s) => STATUS_STAGE[s.status] ?? "uploading");
    const worstIdx = Math.min(...stages.map((s) => STAGE_ORDER.indexOf(s)));
    onStage(STAGE_ORDER[Math.max(0, worstIdx)]);

    if (statuses.every((s) => s.status === "ready")) return;

    await new Promise((r) => setTimeout(r, 600));
  }
}

export function useDocuments(sessionId: string) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  const upload = useCallback(
    async (files: File[], scope: "private" | "shared" = "private") => {
      if (!sessionId) return;
      setIsUploading(true);
      setUploadError(null);
      setUploadStage("uploading");

      try {
        // POST returns immediately with status='uploading' records
        const pendingDocs = await uploadDocuments(files, sessionId, scope);
        const docIds = pendingDocs.map((d) => d.doc_id);

        // Add pending records so they appear in the sidebar right away
        setDocuments((prev) => {
          const existingIds = new Set(prev.map((d) => d.doc_id));
          return [...prev, ...pendingDocs.filter((d) => !existingIds.has(d.doc_id))];
        });
        setSelectedDocIds((prev) => {
          const next = new Set(prev);
          pendingDocs.forEach((d) => next.add(d.doc_id));
          return next;
        });

        // Poll until all docs reach 'ready'
        await pollUntilReady(docIds, setUploadStage);

        // Refresh to get final page_count / chunk_count values
        const finalDocs = await listDocuments();
        setDocuments(finalDocs);

        setUploadStage("done");
        setTimeout(() => {
          setIsUploading(false);
          setUploadStage(null);
        }, 1200);
      } catch (e: unknown) {
        setUploadError(e instanceof Error ? e.message : "Upload failed");
        setUploadStage(null);
        setIsUploading(false);
      }
    },
    [sessionId],
  );

  const remove = useCallback(async (docId: string) => {
    await deleteDocument(docId);
    setDocuments((prev) => prev.filter((d) => d.doc_id !== docId));
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      next.delete(docId);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch {
      // ignore
    }
  }, []);

  const toggleSelection = useCallback((docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  }, []);

  const setSelection = useCallback((docIds: string[]) => {
    setSelectedDocIds(new Set(docIds));
  }, []);

  return {
    documents,
    isUploading,
    uploadError,
    uploadStage,
    selectedDocIds,
    upload,
    remove,
    refresh,
    toggleSelection,
    setSelection,
  };
}
