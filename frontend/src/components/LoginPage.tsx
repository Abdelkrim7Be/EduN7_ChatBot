import { useState } from "react";

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, name: string, password: string) => Promise<void>;
}

type Tab = "login" | "register";

export function LoginPage({ onLogin, onRegister }: Props) {
  const [tab, setTab] = useState<Tab>("login");
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
        setError("Passwords do not match");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
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
      setError(e instanceof Error ? e.message : "Something went wrong");
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

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-brand-purple flex items-center justify-center shadow-lg shadow-brand-purple/30">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">EduN7</h1>
            <p className="text-xs text-gray-500 mt-1 tracking-wider uppercase">ENSET Mohammedia</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-brand-surface border border-brand-gray rounded-2xl overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-brand-gray">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === t
                    ? "text-white border-b-2 border-brand-purple"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">

            {tab === "register" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Abdelkrim Bellagnech"
                  required
                  className="bg-black border border-brand-gray rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-purple transition-colors"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@enset.ma"
                required
                className="bg-black border border-brand-gray rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-purple transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === "register" ? "Min. 8 characters" : "••••••••"}
                required
                className="bg-black border border-brand-gray rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-purple transition-colors"
              />
            </div>

            {tab === "register" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-black border border-brand-gray rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-purple transition-colors"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full py-2.5 rounded-lg bg-brand-purple text-white text-sm font-semibold hover:bg-brand-purple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? (tab === "login" ? "Signing in…" : "Creating account…")
                : (tab === "login" ? "Sign in" : "Create account")}
            </button>

            {tab === "register" && (
              <p className="text-xs text-gray-600 text-center leading-relaxed">
                Your account starts as <span className="text-gray-400">Student</span>.
                An admin can promote you to Professor.
              </p>
            )}
          </form>
        </div>

        <p className="text-xs text-gray-700">
          Powered by RAG ·{" "}
          <span className="text-brand-purple-light">Gemini · Cerebras · Groq</span>
        </p>
      </div>
    </div>
  );
}
