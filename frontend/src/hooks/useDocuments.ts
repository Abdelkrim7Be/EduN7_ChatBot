import { useState, useCallback } from "react";
import type { DocumentRecord } from "../types";
import { uploadDocuments, deleteDocument, listDocuments } from "../api/client";

export type UploadStage =
  | "uploading"
  | "extracting"
  | "chunking"
  | "embedding"
  | "done"
  | null;

export function useDocuments(sessionId: string) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  const upload = useCallback(
    async (files: File[]) => {
      if (!sessionId) return;
      setIsUploading(true);
      setUploadError(null);
      setUploadStage("uploading");

      const timers: ReturnType<typeof setTimeout>[] = [
        setTimeout(() => setUploadStage("extracting"), 700),
        setTimeout(() => setUploadStage("chunking"),   2000),
        setTimeout(() => setUploadStage("embedding"),  3500),
      ];

      try {
        const newDocs = await uploadDocuments(files, sessionId);
        timers.forEach(clearTimeout);

        setDocuments((prev) => {
          const existingIds = new Set(prev.map((d) => d.doc_id));
          return [...prev, ...newDocs.filter((d) => !existingIds.has(d.doc_id))];
        });
        setSelectedDocIds((prev) => {
          const next = new Set(prev);
          newDocs.forEach((d) => next.add(d.doc_id));
          return next;
        });
        setUploadStage("done");

        setTimeout(() => {
          setIsUploading(false);
          setUploadStage(null);
        }, 1200);
      } catch (e: unknown) {
        timers.forEach(clearTimeout);
        setUploadError(e instanceof Error ? e.message : "Upload failed");
        setUploadStage(null);
        setIsUploading(false);
      }
    },
    [sessionId]
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
