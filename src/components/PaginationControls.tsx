import React from 'react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  onGoToPage: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onItemsPerPageChange?: (count: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  itemsPerPageOptions?: number[];
  showItemsPerPage?: boolean;
  className?: string;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  startIndex,
  endIndex,
  onGoToPage,
  onNextPage,
  onPrevPage,
  onItemsPerPageChange,
  hasNextPage,
  hasPrevPage,
  itemsPerPageOptions = [20, 30, 50, 100],
  showItemsPerPage = true,
  className = '',
}) => {
  if (totalPages <= 1 && totalItems <= itemsPerPageOptions[0]) return null;

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    const delta = 1; // pages to show around current page

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (currentPage > delta + 2) {
      pages.push('...');
    }

    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - delta - 1) {
      pages.push('...');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 pb-2 border-t border-slate-200 mt-4 ${className}`} dir="rtl">
      {/* Info + Items Per Page */}
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>
          عرض {startIndex + 1}-{endIndex} من {totalItems}
        </span>
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">|</span>
            <label htmlFor="items-per-page" className="text-xs text-slate-400">لكل صفحة:</label>
            <select
              id="items-per-page"
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="py-1 px-2 border border-slate-200 rounded-md text-xs bg-white hover:bg-slate-50 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation */}
      <div className="flex items-center gap-1">
        {/* Next Page (appears first in RTL) */}
        <button
          onClick={onNextPage}
          disabled={!hasNextPage}
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 disabled:hover:border-slate-200 disabled:cursor-not-allowed transition-all"
          aria-label="الصفحة التالية"
          title="الصفحة التالية"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        {/* Page Numbers */}
        {pageNumbers.map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-slate-400 text-sm select-none">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onGoToPage(page as number)}
              className={`min-w-[36px] h-9 rounded-lg text-sm font-semibold transition-all ${
                page === currentPage
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                  : 'text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200'
              }`}
              aria-label={`الصفحة ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          )
        ))}

        {/* Previous Page (appears last in RTL) */}
        <button
          onClick={onPrevPage}
          disabled={!hasPrevPage}
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 disabled:hover:border-slate-200 disabled:cursor-not-allowed transition-all"
          aria-label="الصفحة السابقة"
          title="الصفحة السابقة"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
