import type { ReactNode } from "react";

interface Props {
  illustration?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
  className = "",
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}
    >
      {illustration && (
        <div className="mb-4 opacity-90 dark:opacity-80">{illustration}</div>
      )}
      <h3 className="text-sm font-semibold text-brand-navy dark:text-white">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-xs text-brand-gray-text dark:text-white/50 max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-4 py-2 rounded-lg bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue-dark transition-colors shadow-soft"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
