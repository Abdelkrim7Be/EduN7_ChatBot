interface Props {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function AdminPlaceholder({ title, description, icon }: Props) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-brand-navy">{title}</h1>
        <p className="text-sm text-brand-gray-text mt-0.5">{description}</p>
      </div>
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-surface-muted border border-brand-gray flex items-center justify-center mb-4 text-brand-gray-mid">
          {icon}
        </div>
        <p className="text-sm font-medium text-brand-navy">Bientôt disponible</p>
        <p className="text-xs text-brand-gray-text mt-1 max-w-xs">
          Cette section est en cours de développement et sera disponible dans une prochaine version.
        </p>
      </div>
    </div>
  );
}
