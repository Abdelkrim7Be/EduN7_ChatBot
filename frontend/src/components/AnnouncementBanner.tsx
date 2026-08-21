import { useEffect, useState } from "react";
import { Info, AlertTriangle, CheckCircle2, XCircle, X } from "lucide-react";
import type { Announcement } from "../types";
import { fetchActiveAnnouncements } from "../api/client";

const DISMISSED_KEY = "ensetai_dismissed_announcements";

const STYLES: Record<Announcement["type"], { wrap: string; Icon: typeof Info }> = {
  info: { wrap: "bg-accent-soft border-accent/30 text-accent", Icon: Info },
  warning: { wrap: "bg-gold/10 border-gold/30 text-gold", Icon: AlertTriangle },
  success: { wrap: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", Icon: CheckCircle2 },
  error: { wrap: "bg-danger/10 border-danger/30 text-danger", Icon: XCircle },
};

function loadDismissed(): number[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]") as number[];
  } catch {
    return [];
  }
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<number[]>(loadDismissed);

  useEffect(() => {
    fetchActiveAnnouncements()
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]));
  }, []);

  function dismiss(id: number) {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  }

  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-px shrink-0">
      {visible.map((a) => {
        const { wrap, Icon } = STYLES[a.type] ?? STYLES.info;
        return (
          <div
            key={a.id}
            className={`flex items-start gap-3 px-4 py-2.5 border-b ${wrap}`}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">{a.title}</p>
              <p className="text-xs opacity-80 whitespace-pre-wrap">{a.content}</p>
            </div>
            <button
              onClick={() => dismiss(a.id)}
              title="Masquer"
              className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
