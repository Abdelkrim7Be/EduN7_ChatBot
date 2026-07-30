import { useState, useEffect } from "react";

interface Props {
  files: { file: File; index: number }[];
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (renamedFiles: { file: File; index: number }[]) => void;
}

const isValidName = (name: string) => /^[A-Z0-9]+_[A-Z0-9]+_.+\.pdf$/i.test(name);

const suggestValidName = (originalName: string) => {
  if (isValidName(originalName)) return originalName;
  
  let baseName = originalName;
  if (baseName.toLowerCase().endsWith(".pdf")) {
    baseName = baseName.substring(0, baseName.length - 4);
  }
  baseName = baseName.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  baseName = baseName.replace(/^_|_$/g, "");
  
  return `DOC_01_${baseName || "FILE"}.pdf`;
};

export function UploadRenameModal({ files, isOpen, onCancel, onConfirm }: Props) {
  const [newNames, setNewNames] = useState<string[]>([]);

  useEffect(() => {
    if (files.length > 0) {
      setNewNames(files.map(f => suggestValidName(f.file.name)));
    }
  }, [files]);

  if (!isOpen || files.length === 0) return null;

  const allValid = newNames.every(name => isValidName(name));

  const handleConfirm = () => {
    if (!allValid) return;

    const renamedFiles = files.map((f, i) => {
      let finalName = newNames[i].trim();
      if (!finalName.toLowerCase().endsWith(".pdf")) {
        finalName += ".pdf";
      }
      return {
        file: new File([f.file], finalName, { type: f.file.type }),
        index: f.index
      };
    });
    
    onConfirm(renamedFiles);
  };

  const handleNameChange = (idx: number, val: string) => {
    const updated = [...newNames];
    updated[idx] = val;
    setNewNames(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/20 w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 shadow-2xl font-mono text-white flex flex-col relative group scrollbar-hide">
        <div className="absolute top-0 left-0 w-full h-1 bg-white scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
        
        <h2 className="text-sm font-bold tracking-tighter uppercase mb-4 text-red-400">
          INVALID NAMING CONVENTION ({files.length} FILE{files.length > 1 ? 'S' : ''})
        </h2>
        
        <p className="text-xs text-gray-400 mb-4">
          Some files do not follow the required naming convention. Please review and rename them before uploading. Expected format: <strong>COURSE_TYPE_NAME.pdf</strong>
        </p>

        <div className="space-y-4 mb-6">
          {files.map((f, idx) => {
            const currentName = newNames[idx] || "";
            const valid = isValidName(currentName);
            return (
              <div key={idx} className="flex flex-col gap-1 border-l-2 border-white/10 pl-3">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block truncate" title={f.file.name}>
                  Original: {f.file.name}
                </label>
                <input
                  type="text"
                  value={currentName}
                  onChange={(e) => handleNameChange(idx, e.target.value)}
                  className={`w-full bg-black border px-3 py-2 text-sm focus:outline-none transition-colors ${
                    valid
                      ? "border-green-500 focus:border-green-400 text-green-100"
                      : "border-red-500 focus:border-red-400 text-red-100"
                  }`}
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 sticky bottom-0 bg-[#111] pt-4 border-t border-white/10">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allValid}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              allValid
                ? "bg-white text-black hover:bg-gray-200"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            Confirm & Upload All
          </button>
        </div>
      </div>
    </div>
  );
}
