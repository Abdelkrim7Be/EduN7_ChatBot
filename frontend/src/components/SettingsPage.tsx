import { useEffect, useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, User, Key, Image as ImageIcon } from "lucide-react";
import { useToast } from "./ToastProvider";
import { changePassword } from "../api/client";

function visibleName(name: string | null | undefined, email: string): string {
  const trimmed = name?.trim();
  return trimmed || email.split("@")[0] || "Utilisateur";
}

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [nameInput, setNameInput] = useState(user?.name || "");
  const [avatarInput, setAvatarInput] = useState<string | null>(user?.avatar_url || null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    setNameInput(visibleName(user.name, user.email));
    setAvatarInput(user.avatar_url || null);
  }, [user]);

  if (!user) return null;
  const displayName = visibleName(user.name, user.email);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarInput(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    const nextName = nameInput.trim();
    if (!nextName) {
      toast("Le nom affiché ne peut pas être vide", "error");
      setNameInput(displayName);
      return;
    }

    setIsSaving(true);
    try {
      await updateUser(nextName, avatarInput || undefined);
      setNameInput(nextName);
      toast("Profil mis à jour", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Échec de la mise à jour du profil", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast("Les mots de passe ne correspondent pas", "error");
      return;
    }
    if (!currentPassword || !newPassword) {
      toast("Veuillez remplir tous les champs", "error");
      return;
    }
    
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast("Mot de passe modifié", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Échec de la modification du mot de passe", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#000000] paper-texture text-white font-mono overflow-y-auto">
      <header className="glass flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-white/10 rounded-sm transition-colors group">
            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white" />
          </Link>
          <h1 className="text-sm font-bold uppercase tracking-widest">
            Paramètres
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-8 flex gap-8">
        {/* Left Nav */}
        <div className="w-64 shrink-0">
          <nav className="space-y-2 text-sm uppercase tracking-wider font-bold">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                activeTab === "profile"
                  ? "bg-white text-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <User className="w-4 h-4" />
              Profil
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                activeTab === "security"
                  ? "bg-white text-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Key className="w-4 h-4" />
              Sécurité
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "profile" && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-widest mb-6 border-b border-white/20 pb-4">
                  Informations du profil
                </h2>
                <div className="flex items-start gap-8">
                  <div className="w-32 h-32 rounded-sm bg-surface-bright flex items-center justify-center border border-white/20 overflow-hidden shrink-0 group relative">
                    {avatarInput ? (
                      <img src={avatarInput} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-white/50">{displayName.charAt(0).toUpperCase()}</span>
                    )}
                    <div 
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="w-6 h-6 text-white mb-2" />
                      <span className="text-[10px] uppercase tracking-wider text-white">Modifier</span>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                    />
                  </div>
                  
                  <div className="flex-1 space-y-6">
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                        Nom affiché
                      </label>
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="w-full bg-transparent border border-white/20 px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors placeholder:text-white/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                        Adresse e-mail
                      </label>
                      <input
                        type="email"
                        defaultValue={user.email}
                        readOnly
                        className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-gray-400 focus:outline-none cursor-not-allowed"
                      />
                      <p className="mt-2 text-[10px] text-gray-500">L'adresse e-mail ne peut pas être modifiée.</p>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                        Rôle
                      </label>
                      <div className="inline-block px-3 py-1 border border-white/20 text-xs uppercase tracking-widest text-white/70">
                        {user.role}
                      </div>
                    </div>
                    <div className="pt-4 border-t border-white/10">
                      <button 
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? "Saving..." : "Enregistrer"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-widest mb-6 border-b border-white/20 pb-4">
                  Sécurité
                </h2>
                <div className="max-w-md space-y-6">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                      Mot de passe actuel
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Mot de passe actuel"
                        className="w-full bg-transparent border border-white/20 px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors pr-10"
                      />
                      <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                        {showCurrentPassword ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nouveau mot de passe"
                        className="w-full bg-transparent border border-white/20 px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors pr-10"
                      />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                        {showNewPassword ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                      Confirmer le nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirmer le mot de passe"
                        className="w-full bg-transparent border border-white/20 px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors pr-10"
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                        {showConfirmPassword ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                      </button>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <button 
                      onClick={handleChangePassword}
                      disabled={isChangingPassword}
                      className="flex items-center gap-2 px-6 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      <Key className="w-4 h-4" />
                      {isChangingPassword ? "Updating..." : "Mettre à jour le mot de passe"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
