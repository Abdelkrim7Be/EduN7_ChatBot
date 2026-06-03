import { useEffect, useRef, useState } from "react";
import { codeToHtml } from "shiki";

interface Props {
  code: string;
  lang: string;
}

// Shiki loads languages/themes on demand; this set tracks what we've tried so
// an unknown language falls back to plaintext instead of throwing.
const LOADED = new Set<string>();

// Map a few common aliases / unknowns to languages Shiki bundles.
function normalizeLang(lang: string): string {
  const l = lang.toLowerCase().trim();
  const aliases: Record<string, string> = {
    "": "text",
    text: "text",
    txt: "text",
    sh: "bash",
    shell: "bash",
    zsh: "bash",
    js: "javascript",
    ts: "typescript",
    tsx: "tsx",
    jsx: "jsx",
    py: "python",
    yml: "yaml",
    md: "markdown",
  };
  return aliases[l] ?? l;
}

export function CodeBlock({ code, lang }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const language = normalizeLang(lang);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let lang = language;
    codeToHtml(code, {
      lang,
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    })
      .catch(() => {
        // Unknown language → retry as plaintext
        lang = "text";
        return codeToHtml(code, {
          lang,
          themes: { light: "github-light", dark: "github-dark" },
          defaultColor: false,
        });
      })
      .then((out) => {
        if (mounted.current) {
          LOADED.add(lang);
          setHtml(out);
        }
      })
      .catch(() => {});
  }, [code, language]);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const label = language === "text" ? "texte" : language;

  return (
    <div className="not-prose my-3 overflow-hidden rounded-xl border border-brand-gray dark:border-brand-navy-border bg-[#fafbfc] dark:bg-[#0d1117]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-brand-gray dark:border-brand-navy-border bg-brand-surface-muted dark:bg-brand-navy/60">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-gray-text dark:text-white/40">
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] font-medium text-brand-gray-text dark:text-white/50 hover:text-brand-blue dark:hover:text-white transition-colors"
          aria-label={copied ? "Code copié" : "Copier le code"}
        >
          {copied ? (
            <>
              <svg
                className="w-3 h-3 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Copié
            </>
          ) : (
            <>
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copier
            </>
          )}
        </button>
      </div>
      {html ? (
        <div
          className="shiki-wrapper overflow-x-auto text-[13px] leading-relaxed [&_pre]:!bg-transparent [&_pre]:p-3 [&_pre]:m-0"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto p-3 m-0 text-[13px] leading-relaxed text-brand-navy dark:text-white/80">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
