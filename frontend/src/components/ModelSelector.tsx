import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Circle, Sparkles, Zap } from "lucide-react";
import type { Provider, SelectedModel } from "../types";

interface Props {
  providers: Provider[];
  selected: SelectedModel | null;
  onSelect: (provider: string, model: string) => void;
  loading: boolean;
}

const BADGE_COLORS: Record<string, string> = {
  Free: "text-accent border-accent/30 bg-accent/10",
  Fastest: "text-accent border-accent/30 bg-accent/10",
  Powerful: "text-white border-border-heavy bg-surface-dim",
  Standard: "text-gray-400 border-border-subtle bg-black",
  Private: "text-gray-300 border-border-heavy bg-surface-dim",
  Auto: "text-accent border-accent/30 bg-accent/10",
};

const PROVIDER_LABELS: Record<string, string> = {
  groq: "GQ",
  anthropic: "AN",
  openai: "AI",
  ollama: "OL",
  sambanova: "SN",
  mistral: "MI",
  openrouter: "OR",
  cerebras: "CB",
  auto: "AU",
};

export function ModelSelector({
  providers,
  selected,
  onSelect,
  loading,
}: Props) {
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
  const currentModel = currentProvider?.models.find(
    (m) => m.id === selected?.model,
  );

  if (loading || !selected) {
    return (
      <div className="h-8 w-40 rounded-sm border border-border-subtle bg-surface-dim animate-pulse" />
    );
  }

  const autoIsActive = selected.provider === "auto";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 max-w-[280px] items-center gap-2 border border-border-subtle bg-black px-3 text-xs font-mono text-gray-400 transition-colors hover:border-border-heavy hover:text-white"
      >
        <span className="flex h-5 w-5 items-center justify-center border border-border-subtle bg-surface-dim text-[9px] font-bold text-accent">
          {isAuto ? <Sparkles className="h-3 w-3" /> : (PROVIDER_LABELS[selected.provider] ?? "LL")}
        </span>
        <span className="font-bold text-white">
          {isAuto ? "Auto" : (currentProvider?.name ?? selected.provider)}
        </span>
        {!isAuto && (
          <>
            <span className="text-gray-700">/</span>
            <span className="max-w-[130px] truncate text-gray-400">
              {currentModel?.name ?? selected.model}
            </span>
          </>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden border border-border-subtle bg-black font-mono shadow-none">
          <div className="border-b border-border-subtle bg-surface-dim px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Choisir le modèle
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto p-2 space-y-1">
            <button
              onClick={() => {
                onSelect("auto", "auto");
                setOpen(false);
              }}
              className={`mb-2 flex w-full items-center gap-3 border px-3 py-2.5 text-left transition-colors ${
                autoIsActive
                  ? "border-accent/40 bg-accent/10"
                  : "border-transparent hover:border-border-subtle hover:bg-white/5"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center border border-border-subtle bg-surface-dim text-accent">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">Auto</p>
                <p className="text-xs text-gray-500">
                  Sélectionne automatiquement le meilleur modèle
                </p>
              </div>
              {autoIsActive && (
                <Check className="h-4 w-4 flex-shrink-0 text-accent" />
              )}
            </button>

            <div className="border-t border-border-subtle mb-2" />

            {providers
              .filter((p) => p.available)
              .map((provider) => (
                <div key={provider.id} className="mb-2">
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <span className="flex h-5 w-5 items-center justify-center border border-border-subtle bg-surface-dim text-[9px] font-bold text-accent">
                      {provider.id === "groq" ? <Zap className="h-3 w-3" /> : (PROVIDER_LABELS[provider.id] ?? "LL")}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-300">
                      {provider.name}
                    </span>
                    <span
                      className={`ml-auto border px-1.5 py-0.5 text-[10px] font-medium ${
                        BADGE_COLORS[provider.badge] ??
                        "bg-black text-gray-500 border-border-subtle"
                      }`}
                    >
                      {provider.badge}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {provider.models.map((m) => {
                      const isActive =
                        selected.provider === provider.id &&
                        selected.model === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            onSelect(provider.id, m.id);
                            setOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 border px-3 py-2 text-left transition-colors ${
                            isActive
                              ? "border-accent/40 bg-accent/10"
                              : "border-transparent hover:border-border-subtle hover:bg-white/5"
                          }`}
                        >
                          <Circle
                            className={`h-2.5 w-2.5 flex-shrink-0 ${isActive ? "fill-accent text-accent" : "text-gray-700"}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium ${isActive ? "text-white" : "text-gray-300"}`}
                            >
                              {m.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {m.description}
                            </p>
                          </div>
                          {isActive && (
                            <Check className="h-4 w-4 flex-shrink-0 text-accent" />
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
