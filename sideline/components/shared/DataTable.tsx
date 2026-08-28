import type { ReactNode } from "react";
import { Fragment } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  width?: string;
  /** Appended to header `<th>` (after defaults); include alignment overrides like `text-right`. */
  headerClassName?: string;
  /** Appended to body `<td>` (after defaults); include alignment overrides like `text-right`. */
  cellClassName?: string;
  render: (row: T) => ReactNode;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  /** Sticky header inside a scroll parent (e.g. import preview). */
  stickyHeader?: boolean;
  /** Extra classes merged onto the horizontal scroll wrapper (always gets `min-w-0 overflow-x-auto`). */
  wrapperClassName?: string;
  /** Equal fractional width per column (`table-layout: fixed` + colgroup). */
  equalColumns?: boolean;
  /**
   * With `equalColumns`, omit the default `min-w-[520px]` so the table can shrink to its wrapper
   * (nested tables, sidebars). Horizontal scroll still comes from the wrapper when content overflows.
   */
  equalColumnsCompact?: boolean;
  /**
   * Table fills the wrapper with fixed layout instead of `w-max`, so colspan / accordion rows cannot
   * inflate intrinsic width and cause runaway horizontal scroll.
   */
  containedWidth?: boolean;
  /** Tighter cell padding (headers and body). */
  dense?: boolean;
  onRowClick?: (row: T) => void;
  onRowContextMenu?: (e: React.MouseEvent<HTMLTableRowElement>, row: T) => void;
  /** If returned, a full-width row is rendered immediately after this data row. */
  renderAfterRow?: (row: T, index: number) => ReactNode | null;
  rowClassName?: string | ((row: T) => string);
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  stickyHeader = false,
  wrapperClassName = "",
  equalColumns = false,
  equalColumnsCompact = false,
  containedWidth = false,
  dense = false,
  onRowClick,
  onRowContextMenu,
  renderAfterRow,
  rowClassName = "",
}: DataTableProps<T>) {
  const colCount = columns.length;
  const headerSticky = stickyHeader ? "sticky top-0 z-10 bg-slate-900 dark:bg-slate-900" : "";
  const colPct = colCount > 0 ? 100 / colCount : 100;
  const cellLayout = equalColumns ? "min-w-0" : "whitespace-nowrap";

  const equalMinClass =
    equalColumns && !equalColumnsCompact ? "min-w-[520px]" : equalColumns ? "min-w-0" : "";
  const tableWidthClass = equalColumns
    ? `w-full table-fixed ${equalMinClass}`.trim()
    : containedWidth
      ? "w-full table-fixed min-w-0"
      : "min-w-full w-max";

  const thPad = dense ? "px-2 py-1.5" : "px-4 py-2";
  const tdPad = dense ? "px-2 py-2" : "px-4 py-3";

  const wrapperClasses = ["min-w-0 overflow-x-auto overscroll-x-contain", wrapperClassName].filter(Boolean).join(" ");

  return (
    <div className={wrapperClasses}>
      <table className={`border-collapse ${tableWidthClass}`}>
        {equalColumns && colCount > 0 ? (
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={{ width: `${colPct}%` }} />
            ))}
          </colgroup>
        ) : null}
        <thead>
          <tr className={`border-b border-slate-700 dark:border-slate-700 ${headerSticky}`}>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`${col.headerClassName ?? "text-left"} align-top text-xs font-sans font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 ${thPad} ${cellLayout} ${equalColumns ? "" : col.width ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const after = renderAfterRow?.(row, i) ?? null;
            const rowExtra = typeof rowClassName === "function" ? rowClassName(row) : rowClassName;
            return (
              <Fragment key={getRowKey(row, i)}>
                <tr
                  className={`border-b border-slate-800/50 dark:border-slate-800/50 ${onRowClick ? "cursor-pointer" : ""} ${rowExtra}`.trim()}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onContextMenu={onRowContextMenu ? (e) => onRowContextMenu(e, row) : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`${cellLayout} ${col.cellClassName ?? "text-left"} align-top ${tdPad} text-sm font-mono ${equalColumns ? "" : col.width ?? ""}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
                {after ? (
                  <tr className="border-b border-slate-800/50 dark:border-slate-800/50">
                    <td colSpan={colCount} className="min-w-0 max-w-full p-0">
                      {after}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
