import { IconTableOff } from "@tabler/icons-react";

export interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
  onRowClick?: (row: T) => void;
}

const alignClass = {
  left:   "text-left",
  center: "text-center",
  right:  "text-right",
};

// Table conventions (DESIGN-SYSTEM.md §5):
//   14px, tabular-nums, row hover blue-50, selected row blue-100,
//   sticky header with --muted background.
//   Column headers are Sans 14/500 (label style).
export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  emptyMessage = "No records found.",
  loading = false,
  className = "",
  onRowClick,
}: DataTableProps<T>) {
  const isEmpty = !loading && data.length === 0;

  return (
    <div className={`w-full rounded-md bg-muted/40 flex flex-col overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted-foreground/15 border-b border-border">
              {columns.map((col, i) => (
                <th
                  key={`${i}-${String(col.key)}`}
                  style={col.width ? { width: col.width } : undefined}
                  className={`px-4 py-3 text-sm font-medium text-muted-foreground ${
                    alignClass[col.align ?? "left"]
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border bg-card">
                  {columns.map((col, j) => (
                    <td key={`${j}-${String(col.key)}`} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded-sm animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              data.map((row) => (
                <tr
                  key={String(row[keyField])}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`group border-b border-border bg-card hover:bg-blue-50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {columns.map((col, i) => (
                    <td
                      key={`${i}-${String(col.key)}`}
                      className={`px-4 py-3 text-foreground ${alignClass[col.align ?? "left"]}`}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isEmpty && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground py-16">
          <IconTableOff className="w-8 h-8 opacity-40" />
          <span className="text-sm font-medium">{emptyMessage}</span>
        </div>
      )}
    </div>
  );
}
