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
          className="w-1.5 h-1.5 rounded-full bg-brand-blue/70 dark:bg-brand-blue-light/70 animate-dot-pulse"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}
