import { useState, useRef, useEffect } from "react";
import type { Provider, SelectedModel } from "../types";

interface Props {
  providers: Provider[];
  selected: SelectedModel | null;
  onSelect: (provider: string, model: string) => void;
  loading: boolean;
}

const BADGE_COLORS: Record<string, string> = {
  Free:     "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  Fastest:  "bg-brand-blue/15 text-brand-blue border-brand-blue/30",
  Powerful: "bg-brand-navy/10 text-brand-navy border-brand-navy/20",
  Standard: "bg-brand-blue-light/20 text-brand-blue-dark border-brand-blue-light/30",
  Private:  "bg-brand-gold/20 text-brand-gold-dark border-brand-gold/30",
  Auto:     "bg-gradient-to-r from-brand-blue/15 to-brand-gold/15 text-brand-navy border-brand-blue/30",
};

const PROVIDER_ICONS: Record<string, string> = {
  groq:       "⚡",
  anthropic:  "◆",
  openai:     "◎",
  ollama:     "⬡",
  sambanova:  "◈",
  mistral:    "▲",
  openrouter: "⊕",
  cerebras:   "⬟",
  auto:       "✦",
};

export function ModelSelector({ providers, selected, onSelect, loading }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isAuto = selected?.provider === "auto";
  const currentProvider = providers.find((p) => p.id === selected?.provider);
  const currentModel = currentProvider?.models.find((m) => m.id === selected?.model);

  if (loading || !selected) {
    return <div className="h-8 w-40 rounded-lg bg-brand-navy-light animate-pulse" />;
  }

  const autoIsActive = selected.provider === "auto";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-navy-light hover:bg-brand-navy-border border border-brand-navy-border transition-colors text-sm"
      >
        <span className="text-base leading-none">
          {PROVIDER_ICONS[selected.provider] ?? "◦"}
        </span>
        <span className="text-white font-medium">
          {isAuto ? "Auto" : (currentProvider?.name ?? selected.provider)}
        </span>
        {!isAuto && (
          <>
            <span className="text-white/30">·</span>
            <span className="text-white/70 max-w-[120px] truncate">
              {currentModel?.name ?? selected.model}
            </span>
          </>
        )}
        <svg
          className={`w-3.5 h-3.5 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-white border border-brand-gray shadow-xl shadow-brand-navy/10 z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-brand-gray bg-brand-surface-muted">
            <p className="text-xs font-semibold text-brand-gray-text uppercase tracking-wider">Choisir le modèle</p>
          </div>

          <div className="max-h-96 overflow-y-auto p-2 space-y-1">
            {/* Auto option */}
            <button
              onClick={() => { onSelect("auto", "auto"); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors mb-2 ${
                autoIsActive
                  ? "bg-brand-surface-muted border border-brand-blue/40"
                  : "hover:bg-brand-surface-muted border border-transparent"
              }`}
            >
              <span className="text-lg leading-none">✦</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brand-navy">Auto</p>
                <p className="text-xs text-brand-gray-text">Sélectionne automatiquement le meilleur modèle</p>
              </div>
              {autoIsActive && (
                <svg className="w-4 h-4 text-brand-blue flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <div className="border-t border-brand-gray mb-2" />

            {providers.filter((p) => p.available).map((provider) => (
              <div key={provider.id} className="mb-2">
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span className="text-base">{PROVIDER_ICONS[provider.id] ?? "◦"}</span>
                  <span className="text-xs font-semibold text-brand-navy uppercase tracking-wider">
                    {provider.name}
                  </span>
                  <span
                    className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                      BADGE_COLORS[provider.badge] ?? "bg-brand-gray text-brand-gray-text border-brand-gray-mid"
                    }`}
                  >
                    {provider.badge}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {provider.models.map((m) => {
                    const isActive = selected.provider === provider.id && selected.model === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => { onSelect(provider.id, m.id); setOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          isActive
                            ? "bg-brand-blue/10 border border-brand-blue/30"
                            : "hover:bg-brand-surface-muted border border-transparent"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "bg-brand-blue" : "bg-brand-gray-mid"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isActive ? "text-brand-navy" : "text-brand-navy/80"}`}>{m.name}</p>
                          <p className="text-xs text-brand-gray-text truncate">{m.description}</p>
                        </div>
                        {isActive && (
                          <svg className="w-4 h-4 text-brand-blue flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
