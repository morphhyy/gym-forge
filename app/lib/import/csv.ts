/**
 * Minimal RFC 4180 CSV parser (no dependency).
 *
 * Handles quoted fields, escaped quotes (""), embedded delimiters/newlines,
 * CRLF/LF line endings and a leading UTF-8 BOM. The delimiter is auto-detected
 * from the header line (comma or semicolon) unless given explicitly, because
 * Strong has shipped both comma- and semicolon-delimited exports.
 */

export function detectDelimiter(text: string): "," | ";" {
  const firstLine = stripBom(text).split(/\r?\n/, 1)[0] ?? "";
  let commas = 0;
  let semicolons = 0;
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch === ",") commas++;
    else if (!inQuotes && ch === ";") semicolons++;
  }
  return semicolons > commas ? ";" : ",";
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Parse CSV text into an array of rows (arrays of raw string cells). */
export function parseCsvRows(text: string, delimiter?: string): string[][] {
  const input = stripBom(text);
  const delim = delimiter ?? detectDelimiter(input);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
    } else if (ch === delim) {
      row.push(field);
      field = "";
      i++;
    } else if (ch === "\r" || ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (ch === "\r" && input[i + 1] === "\n") i++;
      i++;
    } else {
      field += ch;
      i++;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully empty lines
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/**
 * Parse CSV into objects keyed by normalized header (lowercased, trimmed,
 * internal whitespace collapsed).
 */
export function parseCsvObjects(
  text: string,
  delimiter?: string
): { headers: string[]; records: Record<string, string>[] } {
  const rows = parseCsvRows(text, delimiter);
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map(normalizeHeader);
  const records = rows.slice(1).map((cells) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[h] = (cells[idx] ?? "").trim();
    });
    return rec;
  });
  return { headers, records };
}

export function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Parse a number that may use a decimal comma ("82,5"). Empty -> null. */
export function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const s = raw.trim();
  if (s === "") return null;
  const normalized = /^-?\d+,\d+$/.test(s) ? s.replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
