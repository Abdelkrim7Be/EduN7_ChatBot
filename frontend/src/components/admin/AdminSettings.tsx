import { useEffect, useMemo, useState } from "react";
import { Info, Save, Settings2 } from "lucide-react";
import type { Setting, AdminRole } from "../../api/client";
import { fetchAdminRoles, fetchSettings, updateSetting } from "../../api/client";
import { useToast } from "../ToastProvider";

const GROUPS: Record<string, string> = {
  max_upload_size_mb: "Limites",
  max_docs_per_session: "Limites",
  allow_registration: "Accès",
  default_role: "Accès",
  system_prompt: "IA",
};

const LABELS: Record<string, string> = {
  max_upload_size_mb: "Max Upload Size",
  max_docs_per_session: "Max Docs Per Session",
  allow_registration: "Allow Registration",
  default_role: "Default Role",
  system_prompt: "System Prompt",
};

function formatDate(ts: number | null): string {
  if (!ts) return "Jamais modifié";
  return new Date(ts * 1000).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SettingControl({
  setting,
  draft,
  roles,
  onChange,
}: {
  setting: Setting;
  draft: string;
  roles: AdminRole[];
  onChange: (value: string) => void;
}) {
  if (setting.key === "allow_registration" || setting.kind === "boolean") {
    return (
      <select
        value={draft === "true" ? "true" : "false"}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-36 border border-hairline bg-surface-2 px-3 text-sm text-fg"
      >
        <option value="true">Enabled</option>
        <option value="false">Disabled</option>
      </select>
    );
  }

  if (setting.key === "default_role") {
    return (
      <select
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-44 border border-hairline bg-surface-2 px-3 text-sm text-fg"
      >
        {roles.map((role) => (
          <option key={role.name} value={role.name}>
            {role.name}
          </option>
        ))}
      </select>
    );
  }

  if (setting.key === "system_prompt") {
    return (
      <textarea
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="min-h-28 w-full resize-y border border-hairline bg-surface-2 px-3 py-2 text-sm text-fg"
      />
    );
  }

  if (
    setting.kind === "number" ||
    setting.key === "max_upload_size_mb" ||
    setting.key === "max_docs_per_session"
  ) {
    const unit = setting.key === "max_upload_size_mb" ? "MB" : "";
    return (
      <div className="flex h-9 w-44 items-center border border-hairline bg-surface-2">
        <input
          type="number"
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          min="0"
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-fg"
        />
        {unit && (
          <span className="border-l border-hairline px-3 text-[10px] uppercase tracking-widest text-fg-muted">
            {unit}
          </span>
        )}
      </div>
    );
  }

  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full border border-hairline bg-surface-2 px-3 text-sm text-fg"
    />
  );
}

function SettingRow({
  setting,
  roles,
  onSaved,
}: {
  setting: Setting;
  roles: AdminRole[];
  onSaved: (key: string, value: string) => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState(setting.value);
  const [saving, setSaving] = useState(false);
  const dirty = draft !== setting.value;
  const isPrompt = setting.key === "system_prompt";

  useEffect(() => {
    setDraft(setting.value);
  }, [setting.value]);

  async function handleSave() {
    if (!dirty) return;
    setSaving(true);
    try {
      await updateSetting(setting.key, draft);
      onSaved(setting.key, draft);
      toast(`${LABELS[setting.key] ?? setting.label} mis à jour`, "success");
    } catch {
      toast("Erreur lors de la sauvegarde", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`border border-hairline bg-surface-1 p-4 ${isPrompt ? "md:col-span-2" : ""}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-fg">{LABELS[setting.key] ?? setting.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-fg-secondary">
            {setting.description || "Paramètre runtime appliqué immédiatement."}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-fg-muted">
            {formatDate(setting.updated_at)}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="flex h-9 shrink-0 items-center gap-2 border border-white/20 bg-white px-3 text-xs font-bold text-black transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-surface-2 disabled:text-fg-muted"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "..." : "Enregistrer"}
        </button>
      </div>

      <SettingControl
        setting={setting}
        draft={draft}
        roles={roles}
        onChange={setDraft}
      />
    </div>
  );
}

export function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings()
      .then((loadedSettings) => {
        setSettings(loadedSettings);
        return fetchAdminRoles()
          .then((roleData) => setRoles(roleData.roles))
          .catch(() => setRoles([]));
      })
      .catch(() => toast("Erreur chargement des paramètres", "error"))
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(key: string, value: string) {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value, updated_at: Date.now() / 1000 } : s))
    );
  }

  const grouped = useMemo(() => {
    return settings.reduce<Record<string, Setting[]>>((acc, setting) => {
      const group = GROUPS[setting.key] ?? "Autres";
      acc[group] = [...(acc[group] || []), setting];
      return acc;
    }, {});
  }, [settings]);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-fg">
            <Settings2 className="h-5 w-5 text-accent" />
            Paramètres
          </h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Contrôles runtime clairs, typés et appliqués sans redéploiement
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([group, items]) => (
              <section key={group}>
                <div className="mb-2 text-[10px] uppercase tracking-widest text-fg-muted">
                  {group}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {items.map((setting) => (
                    <SettingRow
                      key={setting.key}
                      setting={setting}
                      roles={roles}
                      onSaved={handleSaved}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="flex gap-3 border border-accent/20 bg-accent/5 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-xs leading-relaxed text-fg-secondary">
            <span className="font-semibold text-fg">Note :</span> ces valeurs sont stockées en base et
            appliquées en temps réel. Les variables <code className="bg-surface-2 px-1 text-accent">.env</code>{" "}
            servent seulement de valeurs initiales.
          </p>
        </div>
      </div>
    </div>
  );
}
