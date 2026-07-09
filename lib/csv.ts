// Small, dependency-free CSV utilities (RFC 4180) used by admin data exports.

export type CsvCell = string | number | boolean | null | undefined;

/** Escape a single field: wrap in quotes when it contains a comma, quote, or newline. */
export function escapeCsvCell(value: CsvCell): string {
    if (value === null || value === undefined) return "";
    const str = typeof value === "string" ? value : String(value);
    if (/[",\r\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/** Join one row of cells into a CSV line. */
export function toCsvRow(cells: CsvCell[]): string {
    return cells.map(escapeCsvCell).join(",");
}

/**
 * Build a CSV string from headers + rows.
 * Rows may have fewer cells than headers (short sections in multi-part reports).
 */
export function arrayToCsv(headers: CsvCell[], rows: CsvCell[][]): string {
    const lines = [toCsvRow(headers), ...rows.map(toCsvRow)];
    return lines.join("\r\n");
}

/** Prepend a UTF-8 BOM so Excel opens Naira/accented characters correctly. */
export function withBom(csv: string): string {
    return `﻿${csv}`;
}

/** Trigger a client-side download of a CSV string. No-op outside the browser. */
export function downloadCsv(filename: string, csv: string): void {
    downloadText(filename, withBom(csv), "text/csv;charset=utf-8");
}

/** Trigger a browser download of arbitrary text with a given MIME type. */
export function downloadText(filename: string, text: string, mime = "text/plain;charset=utf-8"): void {
    if (typeof window === "undefined") return;
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Date stamp for filenames, e.g. "2026-07-08". */
export function dateStamp(d: Date = new Date()): string {
    return d.toISOString().slice(0, 10);
}
