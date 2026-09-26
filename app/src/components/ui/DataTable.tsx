import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown } from "lucide-react";

export function DataTable<T>({ data, columns, pageSize }: { data: T[]; columns: ColumnDef<T, any>[]; pageSize?: number }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: pageSize ?? (data.length || 1) });
  const paginated = Boolean(pageSize);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, ...(paginated ? { pagination } : {}) },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(paginated ? { getPaginationRowModel: getPaginationRowModel() } : {}),
  });

  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const rangeStart = data.length === 0 ? 0 : pageIndex * table.getState().pagination.pageSize + 1;
  const rangeEnd = Math.min(rangeStart + table.getState().pagination.pageSize - 1, data.length);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-[var(--color-border)]">
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="cursor-pointer select-none whitespace-nowrap px-3 py-2.5 font-label text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]"
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === "asc" && <ChevronUp size={12} />}
                        {sorted === "desc" && <ChevronDown size={12} />}
                        {!sorted && <ChevronsUpDown size={11} className="opacity-35" />}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-sunken)]">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap px-3 py-2.5 text-[12.5px] text-[var(--color-ink)]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginated && data.length > 0 && (
        <div className="mt-4 flex items-center justify-between border-t border-[var(--color-hairline)] pt-3.5">
          <span className="font-label text-[11px] text-[var(--color-ink-muted)]">
            <span className="tabular font-medium text-[var(--color-ink)]">{rangeStart}–{rangeEnd}</span> of{" "}
            <span className="tabular font-medium text-[var(--color-ink)]">{data.length}</span>
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-ink-secondary)] transition-colors hover:enabled:border-[var(--color-border-strong)] hover:enabled:text-[var(--color-ink)] disabled:opacity-35"
            >
              <ChevronLeft size={14} strokeWidth={2} />
            </button>
            <span className="tabular font-label text-[11px] text-[var(--color-ink-muted)]">
              Page <span className="font-medium text-[var(--color-ink)]">{pageIndex + 1}</span> of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-ink-secondary)] transition-colors hover:enabled:border-[var(--color-border-strong)] hover:enabled:text-[var(--color-ink)] disabled:opacity-35"
            >
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
