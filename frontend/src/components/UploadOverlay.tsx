import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import type { UploadStage } from "../hooks/useDocuments";

interface Props {
  onUpload: (files: File[], scope: "private" | "shared") => void;
  isUploading: boolean;
  uploadStage: UploadStage;
  error: string | null;
  isPrivileged?: boolean;
}

const STAGE_LABELS: Record<NonNullable<UploadStage>, string> = {
  uploading:  "Envoi du fichier…",
  extracting: "Extraction du texte…",
  chunking:   "Découpage en segments…",
  embedding:  "Construction des embeddings…",
  done:       "Prêt !",
};

const STAGE_ORDER: NonNullable<UploadStage>[] = [
  "uploading",
  "extracting",
  "chunking",
  "embedding",
  "done",
];

export function UploadOverlay({ onUpload, isUploading, uploadStage, error, isPrivileged }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [scope, setScope] = useState<"private" | "shared">("private");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf")
    );
    if (files.length) onUpload(files, scope);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onUpload(files, scope);
    e.target.value = "";
  }

  const currentStageIndex = uploadStage ? STAGE_ORDER.indexOf(uploadStage) : -1;
  const isDone = uploadStage === "done";

  return (
    <div className="flex-1 flex items-center justify-center bg-brand-surface-muted p-8">
      <div className="w-full max-w-lg">

        {/* ENSET AI branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-blue mb-4 shadow-lg shadow-brand-blue/30">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-brand-navy mb-1">ENSET AI</h1>
          <div className="w-10 h-0.5 bg-brand-gold rounded-full mx-auto my-3" />
          <p className="text-brand-gray-text text-sm">
            Importez vos documents PDF et posez vos questions grâce à l'IA
          </p>
        </div>

        {/* Scope toggle — professors and admins only */}
        {isPrivileged && !isUploading && (
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-1 bg-brand-gray rounded-xl p-1">
              <button
                onClick={() => setScope("private")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  scope === "private"
                    ? "bg-white text-brand-navy shadow-sm"
                    : "text-brand-gray-text hover:text-brand-navy"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Privé
              </button>
              <button
                onClick={() => setScope("shared")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  scope === "shared"
                    ? "bg-brand-gold text-brand-navy shadow-sm"
                    : "text-brand-gray-text hover:text-brand-navy"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Partagé avec tous
              </button>
            </div>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all bg-white shadow-sm
            ${isDragging
              ? "border-brand-blue bg-brand-surface-muted scale-[1.01] shadow-md"
              : "border-brand-gray hover:border-brand-blue/60 hover:shadow-md"
            }
            ${isUploading ? "pointer-events-none" : ""}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-full max-w-xs space-y-3">
                {STAGE_ORDER.filter((s) => s !== "done").map((stage, idx) => {
                  const completed = idx < currentStageIndex;
                  const active    = idx === currentStageIndex;
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          completed
                            ? "bg-brand-blue"
                            : active
                            ? "border-2 border-brand-blue"
                            : "border-2 border-brand-gray"
                        }`}
                      >
                        {completed ? (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : active ? (
                          <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                        ) : null}
                      </div>
                      <span
                        className={`text-sm transition-colors ${
                          completed ? "text-brand-gray-text" : active ? "text-brand-navy font-medium" : "text-brand-gray-mid"
                        }`}
                      >
                        {STAGE_LABELS[stage]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {isDone && (
                <p className="text-brand-blue text-sm font-semibold mt-1">
                  Terminé — ouverture du chat…
                </p>
              )}
            </div>
          ) : (
            <>
              <svg className="w-10 h-10 text-brand-gray-mid mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-brand-navy font-medium mb-1">
                Glissez vos PDF ici, ou{" "}
                <span className="text-brand-blue">parcourez vos fichiers</span>
              </p>
              <p className="text-xs text-brand-gray-text">Plusieurs PDF acceptés</p>
            </>
          )}
        </div>

        {error && (
          <p className="mt-3 text-center text-sm text-red-500">{error}</p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
