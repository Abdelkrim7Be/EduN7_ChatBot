import { useEffect, useState } from "react";
import type { Setting } from "../../api/client";
import { fetchSettings, updateSetting } from "../../api/client";
import { useToast } from "../ToastProvider";

function formatDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SettingRow({
  setting,
  onSaved,
}: {
  setting: Setting;
  onSaved: (key: string, value: string) => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState(setting.value);
  const [saving, setSaving] = useState(false);
  const dirty = draft !== setting.value;

  async function handleSave() {
    setSaving(true);
    try {
      await updateSetting(setting.key, draft);
      onSaved(setting.key, draft);
      toast(`${setting.label} mis à jour`, "success");
    } catch {
      toast("Erreur lors de la sauvegarde", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-brand-gray last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-brand-navy">{setting.label}</p>
        <p className="text-xs text-brand-gray-text mt-0.5 leading-relaxed">
          {setting.description}
        </p>
        {setting.updated_at && (
          <p className="text-[10px] text-brand-gray-mid mt-1">
            Modifié le {formatDate(setting.updated_at)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {setting.kind === "boolean" ? (
          <button
            onClick={() => {
              const next = draft === "true" ? "false" : "true";
              setDraft(next);
              updateSetting(setting.key, next)
                .then(() => {
                  onSaved(setting.key, next);
                  toast(`${setting.label} mis à jour`, "success");
                })
                .catch(() => toast("Erreur lors de la sauvegarde", "error"));
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              draft === "true" ? "bg-brand-blue" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                draft === "true" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        ) : (
          <>
            <input
              type={setting.kind === "number" ? "number" : "text"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              min={setting.kind === "number" ? "0" : undefined}
              className="w-28 border border-brand-gray rounded-lg px-2.5 py-1.5 text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white"
            />
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-blue text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-blue/90 transition-colors"
            >
              {saving ? "..." : "Enregistrer"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch(() => toast("Erreur chargement des paramètres", "error"))
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(key: string, value: string) {
    setSettings((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, value, updated_at: Date.now() / 1000 } : s,
      ),
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-navy">Paramètres</h1>
        <p className="text-sm text-brand-gray-text mt-0.5">
          Configuration runtime de la plateforme — modifications immédiates sans
          redéploiement
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-brand-gray shadow-sm px-5">
          {settings.map((s) => (
            <SettingRow key={s.key} setting={s} onSaved={handleSaved} />
          ))}
        </div>
      )}

      <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4">
        <p className="text-xs text-brand-gray-text leading-relaxed">
          <span className="font-semibold text-brand-navy">Note :</span> Ces
          paramètres sont stockés en base de données et s'appliquent en temps
          réel. Les valeurs d'environnement (variables{" "}
          <code className="font-mono bg-white px-1 rounded">.env</code>) servent
          de valeurs par défaut initiales et ne sont pas modifiables ici.
        </p>
      </div>
    </div>
  );
}
