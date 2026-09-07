import { useEffect, useMemo, useState } from "react";
import { Info, Save, Settings2 } from "lucide-react";
import type { Provider } from "../../types";
import type { Setting, AdminRole, PublicAssistantModelOption } from "../../api/client";
import {
  fetchAdminRoles,
  fetchProviders,
  fetchPublicAssistantModelOptions,
  fetchSettings,
  updateSetting,
} from "../../api/client";
import { useToast } from "../ToastProvider";

const GROUPS: Record<string, string> = {
  max_upload_size_mb: "Limits",
  max_docs_per_session: "Limits",
  allow_registration: "Access",
  default_role: "Access",
  system_prompt: "AI",
  model_mode_light: "Model Modes",
  model_mode_flash: "Model Modes",
  model_mode_normal: "Model Modes",
  model_mode_complex: "Model Modes",
  public_assistant_enabled: "Landing Assistant",
  public_assistant_context: "Landing Assistant",
  public_assistant_instructions: "Landing Assistant",
  public_assistant_greeting: "Landing Assistant",
  public_assistant_placeholder: "Landing Assistant",
  public_assistant_fallback_message: "Landing Assistant",
  public_assistant_suggested_questions: "Landing Assistant",
  public_assistant_provider: "Landing Assistant",
  public_assistant_model: "Landing Assistant",
  public_assistant_rate_limit_per_hour: "Landing Assistant",
};

const LABELS: Record<string, string> = {
  max_upload_size_mb: "Max Upload Size",
  max_docs_per_session: "Max Docs Per Session",
  allow_registration: "Allow Registration",
  default_role: "Default Role",
  system_prompt: "System Prompt",
  model_mode_light: "Light",
  model_mode_flash: "Flash",
  model_mode_normal: "Normal",
  model_mode_complex: "Complex",
  public_assistant_enabled: "Landing Assistant Enabled",
  public_assistant_context: "Landing Assistant Public Context",
  public_assistant_instructions: "Landing Assistant Instructions",
  public_assistant_greeting: "Landing Assistant Greeting",
  public_assistant_placeholder: "Landing Assistant Input Placeholder",
  public_assistant_fallback_message: "Landing Assistant Fallback Message",
  public_assistant_suggested_questions: "Landing Assistant Suggested Questions",
  public_assistant_provider: "Landing Assistant Provider",
  public_assistant_model: "Landing Assistant Model",
  public_assistant_rate_limit_per_hour: "Hourly Limit",
};

function formatDate(ts: number | null): string {
  if (!ts) return "Never updated";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
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
  publicAssistantOptions,
  providers,
  settingValues,
  label,
  onChange,
}: {
  setting: Setting;
  draft: string;
  roles: AdminRole[];
  publicAssistantOptions: PublicAssistantModelOption[];
  providers: Provider[];
  settingValues: Record<string, string>;
  label: string;
  onChange: (value: string) => void;
}) {
  if (setting.key === "allow_registration" || setting.kind === "boolean") {
    return (
      <select
        aria-label={label}
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
        aria-label={label}
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

  if (setting.key === "public_assistant_provider") {
    const publicProviders = [...new Set(publicAssistantOptions.map((option) => option.provider))];
    return (
      <select
        aria-label={label}
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-64 border border-hairline bg-surface-2 px-3 text-sm text-fg"
      >
        {publicProviders.map((provider) => (
          <option key={provider} value={provider}>
            {provider === "auto" ? "Auto fallback" : provider}
          </option>
        ))}
      </select>
    );
  }

  if (setting.key.startsWith("model_mode_")) {
    const options = providers
      .filter((provider) => provider.available)
      .flatMap((provider) =>
        provider.models.map((model) => ({
          value: `${provider.id}:${model.id}`,
          label: `${provider.name} / ${model.name}`,
        })),
      );
    const hasDraftOption = options.some((option) => option.value === draft);

    return (
      <select
        aria-label={label}
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full border border-hairline bg-surface-2 px-3 text-sm text-fg"
      >
        {!hasDraftOption && (
          <option value={draft}>
            {draft} (not configured)
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (setting.key === "public_assistant_model") {
    const selectedProvider = settingValues.public_assistant_provider || "auto";
    const modelOptions = publicAssistantOptions.filter(
      (option) => option.provider === selectedProvider,
    );
    const hasDraftOption = modelOptions.some((option) => option.model === draft);
    return (
      <select
        aria-label={label}
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full border border-hairline bg-surface-2 px-3 text-sm text-fg"
      >
        {!hasDraftOption && draft && (
          <option value={draft}>
            {draft} (not configured for {selectedProvider})
          </option>
        )}
        {modelOptions.map((option) => (
          <option key={`${option.provider}:${option.model}`} value={option.model}>
            {option.label}{option.available ? "" : " (not configured)"}
          </option>
        ))}
      </select>
    );
  }

  if (setting.key === "system_prompt" || setting.kind === "textarea") {
    return (
      <textarea
        aria-label={label}
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
          aria-label={label}
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
      aria-label={label}
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
  publicAssistantOptions,
  providers,
  settingValues,
  onSaved,
}: {
  setting: Setting;
  roles: AdminRole[];
  publicAssistantOptions: PublicAssistantModelOption[];
  providers: Provider[];
  settingValues: Record<string, string>;
  onSaved: (key: string, value: string) => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState(setting.value);
  const [saving, setSaving] = useState(false);
  const dirty = draft !== setting.value;
  const isWide = setting.key === "system_prompt" || setting.kind === "textarea";
  const displayLabel = LABELS[setting.key] ?? setting.label;

  useEffect(() => {
    setDraft(setting.value);
  }, [setting.value]);

  async function handleSave() {
    if (!dirty) return;
    setSaving(true);
    try {
      await updateSetting(setting.key, draft);
      onSaved(setting.key, draft);
      toast(`${LABELS[setting.key] ?? setting.label} updated`, "success");
    } catch {
      toast("Failed to save setting", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`border border-hairline bg-surface-1 p-4 ${isWide ? "md:col-span-2" : ""}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-fg">{displayLabel}</p>
          <p className="mt-1 text-xs leading-relaxed text-fg-secondary">
            {setting.description || "Runtime setting applied immediately."}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-fg-muted">
            {formatDate(setting.updated_at)}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          aria-label={`Save ${displayLabel}`}
          className="flex h-9 shrink-0 items-center gap-2 border border-white/20 bg-white px-3 text-xs font-bold text-black transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-surface-2 disabled:text-fg-muted"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "..." : "Save"}
        </button>
      </div>

      <SettingControl
        setting={setting}
        draft={draft}
        roles={roles}
        publicAssistantOptions={publicAssistantOptions}
        providers={providers}
        settingValues={settingValues}
        label={displayLabel}
        onChange={setDraft}
      />
    </div>
  );
}

export function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [publicAssistantOptions, setPublicAssistantOptions] = useState<PublicAssistantModelOption[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSettings(),
      fetchAdminRoles().catch(() => ({ roles: [] as AdminRole[], permissions: [] })),
      fetchPublicAssistantModelOptions().catch(() => [] as PublicAssistantModelOption[]),
      fetchProviders().catch(() => [] as Provider[]),
    ])
      .then(([loadedSettings, roleData, modelOptions, loadedProviders]) => {
        setSettings(loadedSettings);
        setRoles(roleData.roles);
        setPublicAssistantOptions(modelOptions);
        setProviders(loadedProviders);
      })
      .catch(() => toast("Failed to load settings", "error"))
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(key: string, value: string) {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value, updated_at: Date.now() / 1000 } : s))
    );
  }

  const grouped = useMemo(() => {
    return settings.reduce<Record<string, Setting[]>>((acc, setting) => {
      const group = GROUPS[setting.key] ?? "Other";
      acc[group] = [...(acc[group] || []), setting];
      return acc;
    }, {});
  }, [settings]);

  const settingValues = useMemo(
    () =>
      settings.reduce<Record<string, string>>((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {}),
    [settings],
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-fg">
            <Settings2 className="h-5 w-5 text-accent" />
            Settings
          </h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Runtime controls applied without redeploying the platform
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
                <div className="mb-2">
                  <div className="text-[10px] uppercase tracking-widest text-fg-muted">
                    {group}
                  </div>
                  {group === "Landing Assistant" && (
                    <p className="mt-1 max-w-3xl text-xs leading-relaxed text-fg-secondary">
                      Configure the anonymous assistant shown on the landing page. It stays hidden until it is enabled,
                      public context is provided, and a configured allowlisted model is available.
                    </p>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {items.map((setting) => (
                    <SettingRow
                      key={setting.key}
                      setting={setting}
                      roles={roles}
                      publicAssistantOptions={publicAssistantOptions}
                      providers={providers}
                      settingValues={settingValues}
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
            <span className="font-semibold text-fg">Note:</span> these values are stored in the database and
            applied in real time. <code className="bg-surface-2 px-1 text-accent">.env</code>{" "}
            variables are only initial defaults.
          </p>
        </div>
      </div>
    </div>
  );
}
