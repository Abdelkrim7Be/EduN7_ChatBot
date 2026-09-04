import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Plus, Save, Shield, Trash2, Users } from "lucide-react";
import {
  createAdminRole,
  deleteAdminRole,
  fetchAdminRoles,
  updateAdminRolePermissions,
  type AdminPermission,
  type AdminRole,
} from "../../api/client";
import { useToast } from "../ToastProvider";

function groupPermissions(permissions: AdminPermission[]) {
  return permissions.reduce<Record<string, AdminPermission[]>>((acc, permission) => {
    acc[permission.category] = [...(acc[permission.category] || []), permission];
    return acc;
  }, {});
}

function PermissionToggle({
  permission,
  enabled,
  onToggle,
}: {
  permission: AdminPermission;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-start justify-between gap-4 border border-border-subtle bg-surface-dim p-3 text-left hover:bg-white/5 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-xs font-bold text-white">{permission.label}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
          {permission.description}
        </p>
      </div>
      <span
        className={`mt-0.5 h-5 w-9 shrink-0 border transition-colors ${
          enabled ? "border-accent bg-accent/20" : "border-border-heavy bg-black"
        }`}
      >
        <span
          className={`block h-3 w-3 translate-y-[3px] bg-white transition-transform ${
            enabled ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

export function AdminRoles() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPermissions, setNewPermissions] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const grouped = useMemo(() => groupPermissions(permissions), [permissions]);

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    setLoading(true);
    try {
      const data = await fetchAdminRoles();
      setRoles(data.roles);
      setPermissions(data.permissions);
      if (!expanded && data.roles.length > 0) setExpanded(data.roles[0].name);
    } catch {
      toast("Erreur lors du chargement des rôles", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e?: { preventDefault: () => void }) {
    e?.preventDefault();
    const name = newName.trim();
    if (!name) {
      toast("Le nom du rôle est requis", "error");
      return;
    }
    if (!/^[a-z0-9_-]{2,40}$/.test(name)) {
      toast("Le nom doit contenir 2 à 40 caractères: lettres, chiffres, _ ou -", "error");
      return;
    }
    
    setCreating(true);
    try {
      await createAdminRole(name, newDesc.trim(), newPermissions);
      toast("Rôle créé avec succès", "success");
      setExpanded(name);
      setNewName("");
      setNewDesc("");
      setNewPermissions([]);
      setShowForm(false);
      await loadRoles();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erreur lors de la création du rôle", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(roleName: string) {
    if (!confirm(`Voulez-vous vraiment supprimer le rôle "${roleName}" ?`)) return;
    
    try {
      await deleteAdminRole(roleName);
      toast("Rôle supprimé", "success");
      await loadRoles();
    } catch {
      toast("Erreur lors de la suppression", "error");
    }
  }

  async function toggleRolePermission(role: AdminRole, permissionKey: string) {
    const hasPermission = role.permissions.includes(permissionKey);
    const next = hasPermission
      ? role.permissions.filter((p) => p !== permissionKey)
      : [...role.permissions, permissionKey];

    setRoles((prev) =>
      prev.map((r) => r.name === role.name ? { ...r, permissions: next } : r),
    );
    setSaving(role.name);
    try {
      const saved = await updateAdminRolePermissions(role.name, next);
      setRoles((prev) =>
        prev.map((r) => r.name === role.name ? { ...r, permissions: saved } : r),
      );
      toast("Permissions mises à jour", "success");
    } catch {
      toast("Erreur lors de la sauvegarde des permissions", "error");
      await loadRoles();
    } finally {
      setSaving(null);
    }
  }

  function toggleNewPermission(permissionKey: string) {
    setNewPermissions((prev) =>
      prev.includes(permissionKey)
        ? prev.filter((p) => p !== permissionKey)
        : [...prev, permissionKey],
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-xl font-bold text-fg flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Rôles et Permissions
          </h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Définissez ce que chaque rôle peut réellement faire dans la plateforme
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-contrast rounded-xl text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau rôle
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface-1 p-5 rounded-2xl border border-hairline shadow-soft space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-fg">Créer un nouveau rôle</h2>
            <p className="mt-1 text-xs text-fg-muted">Choisissez les permissions avant de l'assigner aux utilisateurs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Nom du rôle</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="moderateur"
                className="w-full border border-hairline bg-surface-2 rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Description</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Modération contenu et annonces"
                className="w-full border border-hairline bg-surface-2 rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <p className="mb-2 text-[10px] uppercase tracking-widest text-fg-muted">{category}</p>
                <div className="grid md:grid-cols-2 gap-2">
                  {items.map((permission) => (
                    <PermissionToggle
                      key={permission.key}
                      permission={permission}
                      enabled={newPermissions.includes(permission.key)}
                      onToggle={() => toggleNewPermission(permission.key)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-3 border-t border-hairline bg-surface-1/95 px-5 py-4 backdrop-blur">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-fg-secondary hover:text-fg hover:bg-surface-2 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-accent text-accent-contrast rounded-xl text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {creating ? "Création..." : "Enregistrer"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-surface-1 rounded-2xl border border-hairline shadow-soft overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {roles.map((role) => {
              const isOpen = expanded === role.name;
              return (
                <div key={role.name}>
                  <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : role.name)}
                      className="flex min-w-0 items-center gap-3 text-left"
                    >
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-fg-muted" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-fg-muted" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-fg">{role.name}</span>
                          {role.is_builtin && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-accent/10 text-accent rounded-full border border-accent/20">
                              Système
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-fg-secondary truncate">
                          {role.description || "Aucune description"}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/admin/users?role=${encodeURIComponent(role.name)}`)}
                      className="flex items-center gap-2 border border-hairline bg-surface-2 px-3 py-2 text-xs text-fg-secondary hover:text-fg hover:border-border-heavy"
                      title={`Voir les utilisateurs ${role.name}`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      {role.user_count}
                    </button>

                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-fg-muted">
                      <Save className={`w-3.5 h-3.5 ${saving === role.name ? "text-accent animate-pulse" : ""}`} />
                      {role.permissions.length}/{permissions.length}
                    </div>

                    {!role.is_builtin ? (
                      <button
                        onClick={() => handleDelete(role.name)}
                        className="p-1.5 text-fg-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        title="Supprimer le rôle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="w-7" />
                    )}
                  </div>

                  {isOpen && (
                    <div className="border-t border-hairline bg-black/40 px-5 py-5 space-y-5">
                      {Object.entries(grouped).map(([category, items]) => (
                        <div key={category}>
                          <p className="mb-2 text-[10px] uppercase tracking-widest text-fg-muted">{category}</p>
                          <div className="grid md:grid-cols-2 gap-2">
                            {items.map((permission) => (
                              <PermissionToggle
                                key={permission.key}
                                permission={permission}
                                enabled={role.permissions.includes(permission.key)}
                                onToggle={() => toggleRolePermission(role, permission.key)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {roles.length === 0 && (
              <div className="px-5 py-12 text-center text-sm text-fg-muted">
                Aucun rôle trouvé
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
