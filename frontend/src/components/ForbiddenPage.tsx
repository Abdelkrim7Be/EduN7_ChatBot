import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";

/**
 * Shown when a signed-in user opens a route their role does not cover.
 * Without it those routes fall through to the catch-all and silently
 * render the chat, which reads as a broken page rather than a refusal.
 */
export function ForbiddenPage({ requiredRole }: { requiredRole?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center bg-[#000000] paper-texture">
      <ShieldOff className="w-10 h-10 text-danger" />
      <div>
        <p className="text-lg font-semibold text-white">Accès refusé</p>
        <p className="text-sm text-white-muted mt-1 max-w-sm">
          Cette section est réservée
          {requiredRole ? ` aux comptes ${requiredRole}` : " à certains rôles"}.
          Contactez un administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>
      </div>
      <Link
        to="/"
        className="text-xs font-medium px-4 py-2 rounded-lg bg-accent text-accent-contrast hover:opacity-90 transition-opacity"
      >
        Retour au chat
      </Link>
    </div>
  );
}
