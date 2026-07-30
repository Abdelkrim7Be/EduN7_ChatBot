import { useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, User, Key, Image as ImageIcon } from "lucide-react";

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [nameInput, setNameInput] = useState(user?.name || "");
  const [avatarInput, setAvatarInput] = useState<string | null>(user?.avatar_url || null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

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
    setIsSaving(true);
    try {
      await updateUser(nameInput, avatarInput || undefined);
    } finally {
      setIsSaving(false);
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
            Settings
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
              Profile
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
              Security
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "profile" && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-widest mb-6 border-b border-white/20 pb-4">
                  Profile Information
                </h2>
                <div className="flex items-start gap-8">
                  <div className="w-32 h-32 rounded-sm bg-surface-bright flex items-center justify-center border border-white/20 overflow-hidden shrink-0 group relative">
                    {avatarInput ? (
                      <img src={avatarInput} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-white/50">{user.name.charAt(0).toUpperCase()}</span>
                    )}
                    <div 
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="w-6 h-6 text-white mb-2" />
                      <span className="text-[10px] uppercase tracking-wider text-white">Change</span>
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
                        Display Name
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
                        Email Address
                      </label>
                      <input
                        type="email"
                        defaultValue={user.email}
                        readOnly
                        className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-gray-400 focus:outline-none cursor-not-allowed"
                      />
                      <p className="mt-2 text-[10px] text-gray-500">Email cannot be changed.</p>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                        Role
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
                        {isSaving ? "Saving..." : "Save Changes"}
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
                  Security
                </h2>
                <div className="max-w-md space-y-6">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-transparent border border-white/20 px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-transparent border border-white/20 px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-transparent border border-white/20 px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <button className="flex items-center gap-2 px-6 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors">
                      <Key className="w-4 h-4" />
                      Update Password
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
