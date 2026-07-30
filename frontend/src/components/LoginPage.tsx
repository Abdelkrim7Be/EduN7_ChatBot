import { useState } from "react";
import { useSearchParams } from "react-router-dom";

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, name: string, password: string) => Promise<void>;
}

type Tab = "login" | "register";

export function LoginPage({ onLogin, onRegister }: Props) {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(
    searchParams.get("tab") === "register" ? "register" : "login"
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (tab === "register") {
      if (password !== confirm) {
        setError("Les mots de passe ne correspondent pas");
        return;
      }
      if (password.length < 8) {
        setError("Le mot de passe doit contenir au moins 8 caractères");
        return;
      }
    }

    setLoading(true);
    try {
      if (tab === "login") {
        await onLogin(email, password);
      } else {
        await onRegister(email, name, password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  function switchTab(t: Tab) {
    setTab(t);
    setError("");
    setPassword("");
    setConfirm("");
  }

  const inputClass =
    "w-full bg-transparent border border-zinc-800 focus:border-white focus:ring-0 text-white p-4 transition-colors duration-200";

  return (
    <div className="min-h-screen flex bg-x-black font-mono text-white">
      {/* LEFT — Brand panel */}
      <section className="hidden lg:flex flex-col justify-between w-1/2 p-16 border-r border-white/10">
        <div className="flex items-center space-x-4">
          <img src="/logo.svg" alt="Logo" className="w-12 h-12" />
          <span className="text-xl font-bold tracking-widest uppercase">ENSET AI</span>
        </div>
        
        <div className="max-w-md">
          <h1 className="text-6xl font-bold mb-6 tracking-tighter leading-none uppercase">
            Sovereign Intelligence
          </h1>
          <p className="text-zinc-500 text-lg">
            Accédez au nœud de recherche institutionnel. Traitement neuronal sécurisé pour l'excellence académique.
          </p>
        </div>
        
        <div className="text-zinc-600 text-xs flex flex-col gap-2 uppercase tracking-widest">
          <p>TERMINAL_STATUS: READY</p>
          <p>© 2026 SOVEREIGN_INTEL_SYSTEMS</p>
        </div>
      </section>

      {/* RIGHT — Auth panel */}
      <section className="w-full lg:w-1/2 bg-[#0e0e0e] flex items-center justify-center p-8 sm:p-12 lg:p-24 relative overflow-hidden">
        <button 
          onClick={() => window.location.href = '/'} 
          className="absolute top-6 right-6 lg:left-6 lg:right-auto text-zinc-500 hover:text-white flex items-center gap-2 text-xs uppercase tracking-widest transition-colors z-20"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Home
        </button>
        <div className="w-full max-w-sm flex flex-col z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-12 flex justify-center">
            <img src="/logo.svg" alt="Logo" className="w-16 h-16" />
          </div>
          
          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-2">
              {tab === "login" ? "Initialize Session" : "Request Access"}
            </h2>
            <p className="text-zinc-400 text-sm">
              {tab === "login" ? "Enter your credentials to continue." : "Register to join the research node."}
            </p>
          </div>

          <div className="flex border-b border-zinc-800 mb-8">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold transition-colors ${
                  tab === t
                    ? "text-white border-b-2 border-white"
                    : "text-zinc-600 hover:text-white"
                }`}
              >
                {t === "login" ? "Login" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {tab === "register" && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className={inputClass}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                Institutional Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="professor@enset.ma"
                required
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                  Security Key
                </label>
                {tab === "login" && (
                  <a href="#" className="text-[10px] text-zinc-500 hover:text-white uppercase">Forgot?</a>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={inputClass}
              />
            </div>

            {tab === "register" && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                  Confirm Key
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={inputClass}
                />
              </div>
            )}

            {error && (
              <div className="border border-red-500/30 bg-red-500/10 text-red-500 text-xs p-3 font-mono">
                [ERROR] {error}
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-bold py-4 px-6 hover:bg-zinc-200 transition-colors duration-200 uppercase tracking-tighter text-sm disabled:opacity-50"
              >
                {loading
                  ? "Processing..."
                  : tab === "login"
                    ? "Connect to Node"
                    : "Initialize Access"}
              </button>
            </div>
          </form>

          {/* Secondary Actions */}
          <div className="mt-12 pt-8 border-t border-zinc-900 flex flex-col items-center gap-4">
            <p className="text-zinc-500 text-xs">
              {tab === "login" ? "Don't have an institutional account?" : "Already connected to the node?"}
            </p>
            <button
              onClick={() => switchTab(tab === "login" ? "register" : "login")}
              className="text-white text-xs border border-zinc-800 px-6 py-2 hover:bg-zinc-900 transition-all uppercase tracking-widest"
            >
              {tab === "login" ? "Request Node Access" : "Authenticate"}
            </button>
          </div>
        </div>

        {/* Bottom Decor */}
        <footer className="absolute bottom-0 left-0 w-full p-4 flex justify-between pointer-events-none opacity-20">
          <div className="text-[8px] font-mono tracking-widest uppercase">SYS_AUTH_v4.0.2</div>
          <div className="text-[8px] font-mono tracking-widest uppercase">LATENCY: 12ms</div>
        </footer>
      </section>
    </div>
  );
}
