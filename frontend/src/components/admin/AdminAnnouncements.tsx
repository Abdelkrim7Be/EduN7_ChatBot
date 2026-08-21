import { useEffect, useState } from "react";
import { Megaphone, Plus, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react";
import {
  fetchAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  toggleAnnouncement,
} from "../../api/client";
import { useToast } from "../ToastProvider";
import type { Announcement } from "../../types";

const TYPE_STYLES: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function AdminAnnouncements() {
  const { toast } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [annType, setAnnType] = useState("info");
  const [creating, setCreating] = useState(false);

  function refresh() {
    setLoading(true);
    fetchAnnouncements()
      .then(setItems)
      .catch(() => toast("Erreur de chargement", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { refresh(); }, []);

  async function handleCreate() {
    if (!title.trim() || !content.trim()) return;
    setCreating(true);
    try {
      await createAnnouncement({ title: title.trim(), content: content.trim(), type: annType });
      toast("Annonce créée", "success");
      setTitle("");
      setContent("");
      setShowForm(false);
      refresh();
    } catch {
      toast("Erreur lors de la création", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: number) {
    try {
      await toggleAnnouncement(id);
      refresh();
    } catch {
      toast("Erreur", "error");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Supprimer cette annonce ?")) return;
    try {
      await deleteAnnouncement(id);
      toast("Annonce supprimée", "success");
      refresh();
    } catch {
      toast("Erreur lors de la suppression", "error");
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-fg">Annonces</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Communiquez avec les utilisateurs de la plateforme
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent text-accent-contrast text-xs font-semibold rounded-xl hover:bg-accent-hover transition-colors"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? "Annuler" : "Nouvelle annonce"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-surface-1 rounded-2xl border border-hairline shadow-soft p-5 space-y-4">
          <input
            type="text"
            placeholder="Titre de l'annonce"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-surface-2 border border-hairline rounded-xl px-4 py-2.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <textarea
            placeholder="Contenu de l'annonce..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full bg-surface-2 border border-hairline rounded-xl px-4 py-2.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          />
          <div className="flex items-center gap-3">
            <select
              value={annType}
              onChange={(e) => setAnnType(e.target.value)}
              className="bg-surface-2 border border-hairline rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="info">ℹ️ Information</option>
              <option value="warning">⚠️ Avertissement</option>
              <option value="success">✅ Succès</option>
              <option value="error">🚨 Urgent</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={creating || !title.trim() || !content.trim()}
              className="px-4 py-2 bg-accent text-accent-contrast text-sm font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {creating ? "Création..." : "Publier"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface-1 rounded-2xl border border-hairline p-12 text-center">
          <Megaphone className="w-8 h-8 text-fg-muted mx-auto mb-2" />
          <p className="text-fg-muted text-sm">Aucune annonce</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((ann) => (
            <div
              key={ann.id}
              className={`bg-surface-1 rounded-2xl border border-hairline shadow-soft p-5 transition-opacity ${
                !ann.is_active ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-fg text-sm">{ann.title}</h3>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                        TYPE_STYLES[ann.type] || TYPE_STYLES.info
                      }`}
                    >
                      {ann.type}
                    </span>
                    {!ann.is_active && (
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        Inactif
                      </span>
                    )}
                  </div>
                  <p className="text-fg-secondary text-sm leading-relaxed">{ann.content}</p>
                  <p className="text-fg-muted text-[10px] mt-2">
                    Par {ann.author_name || "Admin"} · {new Date(ann.created_at * 1000).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(ann.id)}
                    title={ann.is_active ? "Désactiver" : "Activer"}
                    className="p-1.5 rounded-lg hover:bg-surface-3 text-fg-muted hover:text-fg transition-colors"
                  >
                    {ann.is_active ? (
                      <ToggleRight className="w-4 h-4 text-accent" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-fg-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
