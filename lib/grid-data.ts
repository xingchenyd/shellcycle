import type { Row } from './domain';

export function gridRecords(records: Row[], kind: string, query: string, filter: string, sort: string, name: (id: string) => string) {
  const term = query.trim().toLowerCase();
  return records.filter(r => r.kind === kind &&
    (!term || JSON.stringify(r).toLowerCase().includes(term) || name(r.partnerId).toLowerCase().includes(term) || name(r.projectId).toLowerCase().includes(term)) &&
    (filter === 'all' || r.status === filter || r.quality === filter))
    .sort((a, b) => sort === 'id' ? a.id.localeCompare(b.id) : String(b.created || '').localeCompare(String(a.created || '')) || a.id.localeCompare(b.id));
}

export function csvCell(value: unknown) {
  let text = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
  // Spreadsheet programs may ignore leading whitespace/control characters before formulas.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
