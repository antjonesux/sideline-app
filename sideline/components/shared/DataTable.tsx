import type { ReactNode } from "react";
import { Fragment } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  width?: string;
  render: (row: T) => ReactNode;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  /** Sticky header inside a scroll parent (e.g. import preview). */
  stickyHeader?: boolean;
  /** Outer scroll wrapper (default aligns with accordion `px-4` padding). */
  wrapperClassName?: string;
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
  wrapperClassName = "overflow-x-auto",
  onRowClick,
  onRowContextMenu,
  renderAfterRow,
  rowClassName = "",
}: DataTableProps<T>) {
  const colCount = columns.length;
  const headerSticky = stickyHeader ? "sticky top-0 z-10 bg-slate-900 dark:bg-slate-900" : "";

  return (
    <div className={wrapperClassName}>
      <table className="w-full border-collapse">
        <thead>
          <tr className={`border-b border-slate-700 dark:border-slate-700 ${headerSticky}`}>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`text-left align-top text-xs font-sans font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 px-4 py-2 ${col.width ?? ""}`}
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
                      className={`whitespace-nowrap text-left align-top px-4 py-3 text-sm font-mono ${col.width ?? ""}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
                {after ? (
                  <tr className="border-b border-slate-800/50 dark:border-slate-800/50">
                    <td colSpan={colCount} className="p-0">
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
