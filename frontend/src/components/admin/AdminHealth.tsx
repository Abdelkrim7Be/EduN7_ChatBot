import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Server, XCircle } from "lucide-react";
import type { PlatformHealth } from "../../types";
import { fetchPlatformHealth } from "../../api/client";
import { useToast } from "../ToastProvider";

function statusClass(status: PlatformHealth["overall"]) {
  if (status === "ok") return "border-success/25 bg-success/10 text-success";
  if (status === "warning") return "border-warning/30 bg-warning/10 text-warning";
  return "border-danger/30 bg-danger/10 text-danger";
}

function statusIcon(status: PlatformHealth["overall"]) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4" />;
  return <XCircle className="h-4 w-4" />;
}

export function AdminHealth() {
  const { toast } = useToast();
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setHealth(await fetchPlatformHealth());
    } catch {
      toast("Failed to load platform health", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-full overflow-y-auto p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-fg">
              <Server className="h-5 w-5 text-accent" />
              Platform Health
            </h1>
            <p className="mt-1 text-sm text-fg-secondary">
              Service readiness and configuration checks for the admin console
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-9 items-center gap-2 border border-white/20 bg-white px-3 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {health && (
          <div className={`flex items-center justify-between border px-4 py-3 ${statusClass(health.overall)}`}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              {statusIcon(health.overall)}
              Overall status: {health.overall}
            </div>
            <span className="text-xs tabular-nums">
              {new Date(health.checked_at * 1000).toLocaleString("en-US")}
            </span>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {loading && !health ? (
            <div className="col-span-full flex justify-center py-20">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : (
            health?.components.map((component) => (
              <section key={component.name} className="border border-hairline bg-surface-1 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-fg">{component.name}</h2>
                    <p className="mt-2 break-words text-xs leading-relaxed text-fg-secondary">
                      {component.detail}
                    </p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClass(component.status)}`}>
                    {statusIcon(component.status)}
                    {component.status}
                  </span>
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
