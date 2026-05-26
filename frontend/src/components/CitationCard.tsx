import { useState } from "react";
import type { Citation } from "../types";

interface Props {
  citations: Citation[];
}

export function CitationCard({ citations }: Props) {
  const [open, setOpen] = useState(false);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-brand-purple-light hover:text-brand-purple transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {citations.length} {citations.length === 1 ? "source" : "sources"}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {citations.map((c, i) => (
            <div
              key={i}
              className="rounded-lg bg-black/30 border border-brand-gray p-3 text-xs"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="cite-ref flex-shrink-0">{i + 1}</span>
                <span className="font-semibold text-brand-purple-light truncate">
                  {c.doc_name}
                </span>
                <span className="text-gray-400 flex-shrink-0 ml-auto">p.{c.page_number}</span>
              </div>
              <p className="text-gray-300 leading-relaxed line-clamp-3">{c.excerpt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
