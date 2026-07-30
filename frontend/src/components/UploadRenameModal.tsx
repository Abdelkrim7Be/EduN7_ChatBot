import { useState, useEffect } from "react";

interface Props {
  file: File;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (renamedFile: File) => void;
}

const isValidName = (name: string) => /^[A-Z0-9]+_[A-Z0-9]+_.+\.pdf$/i.test(name);

const suggestValidName = (originalName: string) => {
  if (isValidName(originalName)) return originalName;
  
  let baseName = originalName;
  if (baseName.toLowerCase().endsWith(".pdf")) {
    baseName = baseName.substring(0, baseName.length - 4);
  }
  // Replace spaces and special characters with underscores
  baseName = baseName.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  
  // Make sure we don't have leading/trailing underscores in basename
  baseName = baseName.replace(/^_|_$/g, "");
  
  return `DOC_01_${baseName || "FILE"}.pdf`;
};

export function UploadRenameModal({ file, isOpen, onCancel, onConfirm }: Props) {
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (file) {
      setNewName(suggestValidName(file.name));
    }
  }, [file]);

  if (!isOpen) return null;

  const isValid = isValidName(newName);

  const handleConfirm = () => {
    if (!isValid) return;

    let finalName = newName.trim();
    if (!finalName.toLowerCase().endsWith(".pdf")) {
      finalName += ".pdf";
    }
    
    // Create a new File object with the updated name
    const renamedFile = new File([file], finalName, { type: file.type });
    onConfirm(renamedFile);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/20 w-full max-w-md p-6 shadow-2xl font-mono text-white flex flex-col relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-white scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
        
        <h2 className="text-sm font-bold tracking-tighter uppercase mb-4 text-red-400">
          INVALID NAMING CONVENTION
        </h2>
        
        <p className="text-xs text-gray-400 mb-4">
          The file <strong>{file.name}</strong> does not follow the required naming convention. Please rename it before uploading.
        </p>

        <div className="mb-6">
          <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 block">
            File Name
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={`w-full bg-black border px-3 py-2 text-sm focus:outline-none transition-colors ${
              isValid
                ? "border-green-500 focus:border-green-400 text-green-100"
                : "border-red-500 focus:border-red-400 text-red-100"
            }`}
          />
          <p className="text-[10px] text-gray-500 mt-2">
            Expected format: <strong>COURSE_TYPE_NAME.pdf</strong> (e.g. <em>CS101_LESSON_AI.pdf</em>)
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              isValid
                ? "bg-white text-black hover:bg-gray-200"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            Confirm & Upload
          </button>
        </div>
      </div>
    </div>
  );
}
