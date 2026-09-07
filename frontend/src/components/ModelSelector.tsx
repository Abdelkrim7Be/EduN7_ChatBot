import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Gauge, Layers, Sparkles, Zap } from "lucide-react";
import type { Provider, SelectedModel } from "../types";

interface Props {
  providers: Provider[];
  selected: SelectedModel | null;
  onSelect: (provider: string, model: string) => void;
  loading: boolean;
}

const MODEL_MODES = [
  {
    id: "light",
    label: "Light",
    description: "Short answers and low-cost everyday work",
    icon: Gauge,
  },
  {
    id: "flash",
    label: "Flash",
    description: "Fast responses for quick document questions",
    icon: Zap,
  },
  {
    id: "normal",
    label: "Normal",
    description: "Balanced quality for most academic tasks",
    icon: Sparkles,
  },
  {
    id: "complex",
    label: "Complex",
    description: "Stronger reasoning for dense or difficult work",
    icon: Layers,
  },
] as const;

export function ModelSelector({
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

  if (loading || !selected) {
    return (
      <div className="h-8 w-40 rounded-sm border border-border-subtle bg-surface-dim animate-pulse" />
    );
  }

  const currentMode =
    MODEL_MODES.find((mode) => mode.id === selected.provider) ??
    MODEL_MODES.find((mode) => mode.id === "normal")!;
  const CurrentIcon = currentMode.icon;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 max-w-[220px] items-center gap-2 border border-border-subtle bg-black px-3 text-xs font-mono text-gray-400 transition-colors hover:border-border-heavy hover:text-white"
      >
        <span className="flex h-5 w-5 items-center justify-center border border-border-subtle bg-surface-dim text-[9px] font-bold text-accent">
          <CurrentIcon className="h-3 w-3" />
        </span>
        <span className="font-bold text-white">
          {currentMode.label}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden border border-border-subtle bg-black font-mono shadow-none">
          <div className="border-b border-border-subtle bg-surface-dim px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Choose Model Mode
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto p-2 space-y-1">
            {MODEL_MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = selected.provider === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    onSelect(mode.id, mode.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 border px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "border-accent/40 bg-accent/10"
                      : "border-transparent hover:border-border-subtle hover:bg-white/5"
                  }`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-border-subtle bg-surface-dim text-accent">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{mode.label}</p>
                    <p className="truncate text-xs text-gray-500">{mode.description}</p>
                  </div>
                  {isActive && <Check className="h-4 w-4 shrink-0 text-accent" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
