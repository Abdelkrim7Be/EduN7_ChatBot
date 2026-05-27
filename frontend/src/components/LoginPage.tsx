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
    "bg-brand-surface-muted border border-brand-gray rounded-lg px-3 py-2.5 text-sm text-brand-navy placeholder-brand-gray-text outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all w-full";

  return (
    <div className="min-h-screen flex">
      {/* LEFT — ENSET brand panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-brand-navy flex-col items-center justify-center px-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-brand-blue/10 rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-brand-gold/10 rounded-full" />

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-brand-blue flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-blue/40">
            <svg
              className="w-11 h-11 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>

          <h1 className="text-5xl font-bold text-white tracking-tight">
            ENSET AI
          </h1>

          <div className="flex items-center justify-center gap-3 my-5">
            <div className="h-px w-10 bg-white/20" />
            <div className="w-12 h-1 bg-brand-gold rounded-full" />
            <div className="h-px w-10 bg-white/20" />
          </div>

          <p className="text-brand-blue-light text-xs font-semibold uppercase tracking-widest mb-1">
            École Normale Supérieure
          </p>
          <p className="text-brand-blue-light text-xs font-semibold uppercase tracking-widest mb-8">
            de l'Enseignement Technique · Mohammedia
          </p>

          <p className="text-white/60 text-sm leading-relaxed max-w-[260px] mx-auto">
            Explorez vos documents et posez vos questions. Votre assistant
            pédagogique, disponible à tout moment.
          </p>

          <div className="mt-12 flex items-center justify-center gap-2 text-xs text-white/25 uppercase tracking-wider">
            <span>Université Hassan II</span>
            <span>·</span>
            <span>Casablanca</span>
          </div>
        </div>
      </div>

      {/* RIGHT — login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-brand-surface-muted">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="flex flex-col items-center gap-2 mb-8 lg:hidden">
            <div className="w-14 h-14 rounded-xl bg-brand-blue flex items-center justify-center shadow-lg shadow-brand-blue/30">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-brand-navy">ENSET AI</h1>
            <p className="text-xs text-brand-gray-text uppercase tracking-widest">
              ENSET Mohammedia
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-brand-navy/10 border border-brand-gray overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-brand-gray">
              <h2 className="text-lg font-bold text-brand-navy">
                {tab === "login" ? "Bienvenue" : "Créer un compte"}
              </h2>
              <p className="text-sm text-brand-gray-text mt-0.5">
                {tab === "login"
                  ? "Connectez-vous à votre espace ENSET AI"
                  : "Rejoignez la plateforme pédagogique"}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-brand-gray">
              {(["login", "register"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    tab === t
                      ? "text-brand-blue border-b-2 border-brand-blue bg-brand-surface-muted/50"
                      : "text-brand-gray-text hover:text-brand-navy"
                  }`}
                >
                  {t === "login" ? "Se connecter" : "S'inscrire"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              {tab === "register" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-brand-navy">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Abdelkrim Bellagnech"
                    required
                    className={inputClass}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-brand-navy">
                  Adresse email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@enset.ma"
                  required
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-brand-navy">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    tab === "register" ? "Min. 8 caractères" : "••••••••"
                  }
                  required
                  className={inputClass}
                />
              </div>

              {tab === "register" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-brand-navy">
                    Confirmer le mot de passe
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
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full py-2.5 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-brand-blue/20"
              >
                {loading
                  ? tab === "login"
                    ? "Connexion…"
                    : "Création du compte…"
                  : tab === "login"
                    ? "Se connecter"
                    : "Créer mon compte"}
              </button>

              {tab === "register" && (
                <p className="text-xs text-brand-gray-text text-center leading-relaxed">
                  Votre compte sera enregistré en tant qu'
                  <span className="text-brand-navy font-medium">Étudiant</span>.
                  Un administrateur peut vous promouvoir au rang de Professeur.
                </p>
              )}
            </form>
          </div>

          <p className="text-xs text-brand-gray-text text-center mt-6">
            Propulsé par RAG ·{" "}
            <span className="text-brand-blue font-medium">
              Gemini · Cerebras · Groq
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
