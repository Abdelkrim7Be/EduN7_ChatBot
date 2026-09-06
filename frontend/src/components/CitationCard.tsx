import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
        aria-expanded={open}
        className="group flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white transition-colors font-bold uppercase tracking-widest"
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="flex-shrink-0"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </motion.span>
        {citations.length} {citations.length === 1 ? "source" : "sources"}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="citations"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5">
              {citations.map((c, i) => (
                <div
                  key={i}
                  className="bg-[#111] border border-white/10 p-3 text-xs mb-2 rounded"
                >
                  <div className="flex items-center gap-2 mb-1.5 border-b border-white/10 pb-1">
                    <span className="bg-white/10 px-1 text-[10px] font-mono mx-0.5 text-white flex-shrink-0">{i + 1}</span>
                    <span className="font-bold text-white truncate flex-1 uppercase tracking-tighter">
                      {c.doc_name}
                    </span>
                    <span className="text-gray-500 flex-shrink-0 tabular-nums">
                      p.{c.page_number}
                    </span>
                  </div>
                  <p className="text-gray-400 leading-relaxed line-clamp-3 text-[11px]">
                    {c.excerpt}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
