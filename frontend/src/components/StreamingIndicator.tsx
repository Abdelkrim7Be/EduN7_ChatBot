import { useState, useEffect } from "react";

export function StreamingIndicator() {
  return (
    <span
      className="inline-flex items-center gap-1 py-1"
      aria-label="Génération en cours"
      role="status"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}

const VERBS = [
  "Analyse du contexte",
  "Synthèse des données",
  "Modélisation de la réponse",
  "Structuration du raisonnement",
  "Compilation des résultats",
  "Génération de la réponse",
  "Évaluation des paramètres"
];

export function ThinkingStatus() {
  const [verbIndex, setVerbIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVerbIndex((prev) => (prev + 1) % VERBS.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
      <svg className="animate-spin w-3 h-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {VERBS[verbIndex]}<span className="animate-pulse">...</span>
    </span>
  );
}
