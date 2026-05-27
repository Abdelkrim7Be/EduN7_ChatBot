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
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-brand-blue/8 rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-gold/8 rounded-full" />
        <div className="absolute top-1/3 -left-10 w-32 h-32 bg-brand-blue/5 rounded-full" />

        <div className="relative z-10 w-full max-w-[300px]">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-brand-blue flex items-center justify-center mb-6 shadow-xl shadow-brand-blue/40">
            <svg
              className="w-9 h-9 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
              />
            </svg>
          </div>

          {/* Title + school */}
          <h1 className="text-4xl font-bold text-white tracking-tight mb-1">
            ENSET AI
          </h1>
          <p className="text-brand-blue-light text-sm font-normal mb-6">
            École Normale Supérieure de l'Enseignement Technique
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-white/10" />
            <div className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Description */}
          <p className="text-white/65 text-sm leading-relaxed mb-7">
            Interrogez vos cours, TD et examens directement. Des réponses
            précises avec les sources citées.
          </p>

          {/* Feature list */}
          <ul className="space-y-2.5 mb-8">
            {[
              "Upload de PDF en quelques secondes",
              "Réponses ancrées dans vos documents",
              "Historique et sessions multiples",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-gold flex-shrink-0" />
                <span className="text-white/55 text-xs">{item}</span>
              </li>
            ))}
          </ul>

          {/* CTA hint */}
          <div className="flex items-center gap-2 text-white/30 text-xs">
            <span>Connectez-vous via le formulaire</span>
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </div>

          {/* Footer */}
          <p className="text-white/20 text-xs mt-10">
            Université Hassan II · Mohammedia
          </p>
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
