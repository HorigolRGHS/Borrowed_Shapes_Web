"use client";

interface Props {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
}

export default function ForumPagination({
    page,
    totalPages,
    onChange
}: Props) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex justify-center items-center gap-3 mt-10">
            <button
                disabled={page === 1}
                onClick={() => onChange(page - 1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b17] text-slate-750 dark:text-slate-300 font-semibold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
            >
                Prev
            </button>
            <span className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">
                {page} / {totalPages}
            </span>
            <button
                disabled={page === totalPages}
                onClick={() => onChange(page + 1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b17] text-slate-755 dark:text-slate-300 font-semibold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
            >
                Next
            </button>
        </div>
    )
}