import { useEffect, useState } from "react";
import { Shield, Trash2, Plus } from "lucide-react";
import { fetchAdminRoles, createAdminRole, deleteAdminRole, type AdminRole } from "../../api/client";
import { useToast } from "../ToastProvider";

export function AdminRoles() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    setLoading(true);
    try {
      const data = await fetchAdminRoles();
      setRoles(data);
    } catch {
      toast("Erreur lors du chargement des rôles", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    
    setCreating(true);
    try {
      await createAdminRole(newName.trim(), newDesc.trim());
      toast("Rôle créé avec succès", "success");
      setNewName("");
      setNewDesc("");
      setShowForm(false);
      await loadRoles();
    } catch {
      toast("Erreur lors de la création du rôle", "error");
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-fg flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Rôles et Permissions
          </h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Gérez les rôles personnalisés de l'application
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
        <form onSubmit={handleCreate} className="bg-surface-1 p-5 rounded-2xl border border-hairline shadow-soft space-y-4">
          <h2 className="text-sm font-semibold text-fg">Créer un nouveau rôle</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Nom du rôle (ex: moderateur)</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="Nom unique sans espace..."
                className="w-full border border-hairline bg-surface-2 rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Description</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brève description..."
                className="w-full border border-hairline bg-surface-2 rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-fg-secondary hover:text-fg hover:bg-surface-2 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
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
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2/60 border-b border-hairline">
                <th className="text-left px-5 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Rôle</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Utilisateurs</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {roles.map((role) => (
                <tr key={role.name} className="hover:bg-surface-2/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-fg">{role.name}</span>
                      {role.is_builtin && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-accent/10 text-accent rounded-full border border-accent/20">
                          Système
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-fg-secondary">
                    {role.description || <span className="italic text-fg-muted">Aucune description</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-surface-2 rounded-lg text-fg-secondary border border-hairline">
                      {role.user_count}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {!role.is_builtin && (
                      <button
                        onClick={() => handleDelete(role.name)}
                        className="p-1.5 text-fg-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        title="Supprimer le rôle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm text-fg-muted">
                    Aucun rôle trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
