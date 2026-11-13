import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export default function Pagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  const startIndex = total === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onLimitChange(Number(e.target.value));
    onPageChange(1);
  };

  return (
    <div className="px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs text-slate-500">
        Showing {startIndex} to {endIndex} of {total} results
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Rows</span>
          <select
            className="h-8 px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            value={limit}
            onChange={handleLimitChange}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {totalPages > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              aria-label="Previous page"
              className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`h-8 w-8 rounded-md text-xs font-medium transition ${
                    pageNum === page
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && page < totalPages - 2 && (
              <>
                <span className="px-1 text-xs text-slate-400">...</span>
                <button
                  onClick={() => onPageChange(totalPages)}
                  className="h-8 w-8 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              aria-label="Next page"
              className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
