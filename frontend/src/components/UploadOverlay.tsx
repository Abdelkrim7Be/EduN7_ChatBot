import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import type { UploadStage } from "../hooks/useDocuments";

interface Props {
  onUpload: (files: File[]) => void;
  isUploading: boolean;
  uploadStage: UploadStage;
  error: string | null;
}

const STAGE_LABELS: Record<NonNullable<UploadStage>, string> = {
  uploading:  "Uploading file…",
  extracting: "Extracting text…",
  chunking:   "Creating chunks…",
  embedding:  "Building embeddings…",
  done:       "Ready!",
};

const STAGE_ORDER: NonNullable<UploadStage>[] = [
  "uploading",
  "extracting",
  "chunking",
  "embedding",
  "done",
];

export function UploadOverlay({ onUpload, isUploading, uploadStage, error }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf")
    );
    if (files.length) onUpload(files);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onUpload(files);
    e.target.value = "";
  }

  const currentStageIndex = uploadStage ? STAGE_ORDER.indexOf(uploadStage) : -1;
  const isDone = uploadStage === "done";

  return (
    <div className="flex-1 flex items-center justify-center bg-black p-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-purple/20 mb-4">
            <svg className="w-8 h-8 text-brand-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">EduN7</h1>
          <p className="text-gray-400 text-sm">Upload your PDF documents and chat with them using AI</p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
            ${isDragging
              ? "border-brand-purple bg-brand-purple/10 scale-[1.01]"
              : "border-brand-gray hover:border-brand-purple/50 hover:bg-brand-surface"
            }
            ${isUploading ? "pointer-events-none" : ""}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-4">
              {/* Stage progress track */}
              <div className="w-full max-w-xs space-y-2">
                {STAGE_ORDER.filter((s) => s !== "done").map((stage, idx) => {
                  const completed = idx < currentStageIndex;
                  const active    = idx === currentStageIndex;
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          completed
                            ? "bg-brand-purple"
                            : active
                            ? "border-2 border-brand-purple"
                            : "border-2 border-brand-gray"
                        }`}
                      >
                        {completed ? (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : active ? (
                          <div className="w-2 h-2 rounded-full bg-brand-purple animate-pulse" />
                        ) : null}
                      </div>
                      <span
                        className={`text-sm transition-colors ${
                          completed ? "text-gray-400" : active ? "text-white" : "text-gray-600"
                        }`}
                      >
                        {STAGE_LABELS[stage]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {isDone && (
                <p className="text-brand-purple-light text-sm font-medium mt-1">
                  Done — opening chat…
                </p>
              )}
            </div>
          ) : (
            <>
              <svg className="w-10 h-10 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-300 font-medium mb-1">
                Drop PDF files here, or <span className="text-brand-purple-light">click to browse</span>
              </p>
              <p className="text-xs text-gray-500">Supports multiple PDFs</p>
            </>
          )}
        </div>

        {error && (
          <p className="mt-3 text-center text-sm text-red-400">{error}</p>
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
