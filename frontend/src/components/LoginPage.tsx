import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, name: string, password: string) => Promise<void>;
}

type Tab = "login" | "register";

export function LoginPage({ onLogin, onRegister }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(
    searchParams.get("tab") === "register" ? "register" : "login"
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");

    if (tab === "register") {
      if (password !== confirm) {
        setError("Passwords do not match");
        return;
      }
      if (password.length < 8) {
        setError("Password must contain at least 8 characters");
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
      navigate("/", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
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
    <div className="min-h-screen flex overflow-x-hidden bg-x-black text-white">
      {/* LEFT — Brand panel */}
      <section className="hidden lg:flex flex-col justify-between w-1/2 p-16 border-r border-white/10">
        <div className="flex items-center space-x-4">
          <img src="/logo.svg" alt="Logo" className="w-12 h-12" />
          <span className="text-xl font-bold tracking-widest uppercase">ENSET AI</span>
        </div>
        
        <div className="max-w-md">
          <h1 className="text-5xl xl:text-6xl font-bold mb-6 tracking-tight leading-none uppercase break-words">
            Academic AI Platform
          </h1>
          <p className="text-zinc-500 text-lg">
            Sign in to analyze your private academic documents, organize your
            conversations, and get cited answers.
          </p>
        </div>
        
        <div className="text-zinc-600 text-xs flex flex-col gap-2 uppercase tracking-widest">
          <p>Private ENSET AI platform</p>
          <p>© 2026 ENSET AI</p>
        </div>
      </section>

      {/* RIGHT — Auth panel */}
      <section className="w-full lg:w-1/2 bg-[#0e0e0e] flex items-center justify-center p-8 sm:p-12 lg:p-24 relative overflow-hidden">
        <button
          type="button"
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
              {tab === "login" ? "Enter your credentials to continue." : "Register to join the platform."}
            </p>
          </div>

          <div className="flex border-b border-zinc-800 mb-8">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tab === t}
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
                <label htmlFor="auth-name" className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  name="name"
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
              <label htmlFor="auth-email" className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                Institutional Email
              </label>
              <input
                id="auth-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="professor@enset.ma"
                autoComplete="username"
                required
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="auth-password" className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                  Security Key
                </label>
                {tab === "login" && (
                  <span className="text-[10px] text-zinc-600 uppercase">Managed access</span>
                )}
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                  required
                  className={inputClass}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {tab === "register" && (
              <div className="space-y-2">
                <label htmlFor="auth-confirm" className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                  Confirm Key
                </label>
                <div className="relative">
                  <input
                    id="auth-confirm"
                    name="confirm_password"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    className={inputClass}
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? "Hide confirmation" : "Show confirmation"}
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showConfirm ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
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
                    ? "Authenticate"
                    : "Create Account"}
              </button>
            </div>
          </form>

          {/* Secondary Actions */}
          <div className="mt-12 pt-8 border-t border-zinc-900 flex flex-col items-center gap-4">
            <p className="text-zinc-500 text-xs">
              {tab === "login" ? "Need an account?" : "Already registered?"}
            </p>
            <button
              type="button"
              onClick={() => switchTab(tab === "login" ? "register" : "login")}
              className="text-white text-xs border border-zinc-800 px-6 py-2 hover:bg-zinc-900 transition-all uppercase tracking-widest"
            >
              {tab === "login" ? "Request Access" : "Back to Login"}
            </button>
          </div>
        </div>

        {/* Bottom Decor */}
        <footer className="absolute bottom-0 left-0 w-full p-4 flex justify-between pointer-events-none opacity-20">
          <div className="text-[8px] tracking-widest uppercase">ENSET_AI_AUTH</div>
          <div className="text-[8px] tracking-widest uppercase">Secure access</div>
        </footer>
      </section>
    </div>
  );
}
