import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

function pageWindow(page: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  if (page <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (page >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  return sorted.flatMap((p, i) => {
    const prev = sorted[i - 1];
    return prev && p - prev > 1 ? ["..." as const, p] : [p];
  });
}

export function AdminPagination({ page, pageSize, total, loading, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (total <= pageSize && totalPages === 1) {
    return (
      <div className="sticky bottom-0 z-10 border-t border-hairline bg-surface-1/95 px-4 py-3 text-xs text-fg-muted backdrop-blur">
        {total} result{total !== 1 ? "s" : ""}
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-hairline bg-surface-1/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-fg-muted">
        {start}-{end} / {total}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={loading || page <= 1}
          className="flex h-8 w-8 items-center justify-center border border-hairline text-fg-secondary hover:text-fg disabled:cursor-not-allowed disabled:text-fg-muted"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageWindow(page, totalPages).map((item, i) =>
          item === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-xs text-fg-muted">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              disabled={loading || item === page}
              className={`h-8 min-w-8 border px-2 text-xs font-bold ${
                item === page
                  ? "border-white bg-white text-black"
                  : "border-hairline text-fg-secondary hover:text-fg"
              }`}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={loading || page >= totalPages}
          className="flex h-8 w-8 items-center justify-center border border-hairline text-fg-secondary hover:text-fg disabled:cursor-not-allowed disabled:text-fg-muted"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
