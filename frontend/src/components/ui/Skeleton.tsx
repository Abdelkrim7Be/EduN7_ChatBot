interface Props {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
}

const ROUND: Record<NonNullable<Props["rounded"]>, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

export function Skeleton({ className = "h-4 w-full", rounded = "md" }: Props) {
  return (
    <div
      className={`${className} ${ROUND[rounded]} bg-gradient-to-r from-brand-gray via-brand-gray-mid/40 to-brand-gray dark:from-brand-navy-light dark:via-brand-navy-border dark:to-brand-navy-light bg-[length:200%_100%] animate-shimmer`}
      aria-hidden="true"
    />
  );
}
