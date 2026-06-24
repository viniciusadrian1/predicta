// ── CSV export ────────────────────────────────────────────────────────────────
// Build a CSV string from rows and trigger a real browser download.

function escapeCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) return headers ? headers.join(";") : "";
  const cols = headers ?? Object.keys(rows[0]);
  const head = cols.join(";");
  const body = rows.map((r) => cols.map((c) => escapeCell(r[c])).join(";")).join("\n");
  return `${head}\n${body}`;
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[], headers?: string[]): void {
  const csv = toCSV(rows, headers);
  // BOM so Excel (pt-BR) opens accented characters correctly.
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
