/**
 * Binder export to PDF – list or card images, filtered by collected / not collected / both.
 * Native: expo-print + expo-sharing. Web: open HTML in new window and print() so the dialog shows binder content.
 */

import { Platform } from 'react-native';

export type ExportFormat = 'list' | 'pictures';
export type ExportInclude = 'collected' | 'not_collected' | 'both';

export interface ExportEntry {
  slotKey: string;
  name: string;
  setLabel: string;
  collectorNumber: string;
  variantLabel: string;
  collected: boolean;
  /** Image URL for pictures format. Optional for list-only. */
  imageUri: string | null;
}

export interface ExportOptions {
  binderName: string;
  format: ExportFormat;
  include: ExportInclude;
  entries: ExportEntry[];
}

const PAGE_STYLE = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 16px; background: #1a1a1a; color: #f5f5f5; font-size: 12px; }
  h1 { font-size: 18px; margin: 0 0 12px 0; color: #ffcf1c; }
  .meta { color: #a0a0a0; font-size: 11px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
  th { color: #a0a0a0; font-weight: 600; }
  .collected { color: #4caf50; }
  .not-collected { color: #888; }
  .img-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .img-cell { width: 140px; text-align: center; }
  .img-cell img { width: 120px; height: 168px; object-fit: contain; border-radius: 8px; background: #2d2d2d; }
  .img-cell .name { font-size: 10px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .img-cell .meta { margin: 0; font-size: 9px; }
  @media print { body { background: #fff; color: #111; } th, td { border-color: #ddd; } .collected { color: #0a0; } .not-collected { color: #666; } .img-cell img { background: #f0f0f0; } }
`;

function filterEntries(entries: ExportEntry[], include: ExportInclude): ExportEntry[] {
  if (include === 'both') return entries;
  if (include === 'collected') return entries.filter((e) => e.collected);
  return entries.filter((e) => !e.collected);
}

function buildListHtml(binderName: string, entries: ExportEntry[], include: ExportInclude): string {
  const filtered = filterEntries(entries, include);
  const rows = filtered
    .map(
      (e) =>
        `<tr><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.setLabel)}</td><td>${escapeHtml(e.collectorNumber)}</td><td>${escapeHtml(e.variantLabel)}</td><td class="${e.collected ? 'collected' : 'not-collected'}">${e.collected ? 'Yes' : '—'}</td></tr>`
    )
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PAGE_STYLE}</style></head><body>
<h1>${escapeHtml(binderName)}</h1>
<p class="meta">Export: list · ${include === 'both' ? 'All slots' : include === 'collected' ? 'Collected only' : 'Not collected only'} · ${filtered.length} items</p>
<table><thead><tr><th>Card</th><th>Set</th><th>No.</th><th>Variant</th><th>Collected</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPicturesHtml(binderName: string, entries: ExportEntry[], include: ExportInclude): string {
  const filtered = filterEntries(entries, include);
  const cells = filtered
    .map((e) => {
      const img = e.imageUri
        ? `<img src="${escapeHtml(e.imageUri)}" alt="" loading="lazy" />`
        : '<div style="width:120px;height:168px;background:#2d2d2d;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#666;">No image</div>';
      return `<div class="img-cell">${img}<div class="name">${escapeHtml(e.name)}</div><p class="meta">${escapeHtml(e.setLabel)} ${e.collectorNumber ? '#' + escapeHtml(e.collectorNumber) : ''} ${escapeHtml(e.variantLabel)} · ${e.collected ? '✓' : '—'}</p></div>`;
    })
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PAGE_STYLE}</style></head><body>
<h1>${escapeHtml(binderName)}</h1>
<p class="meta">Export: pictures · ${include === 'both' ? 'All slots' : include === 'collected' ? 'Collected only' : 'Not collected only'} · ${filtered.length} items</p>
<div class="img-grid">${cells}</div>
</body></html>`;
}

export function buildExportHtml(options: ExportOptions): string {
  const { binderName, format, include, entries } = options;
  if (format === 'list') return buildListHtml(binderName, entries, include);
  return buildPicturesHtml(binderName, entries, include);
}

/** On web, expo-print's printToFileAsync just calls window.print() and ignores our HTML, so the preview shows the app. We open our HTML in a new window and print that instead. */
async function exportOnWeb(options: ExportOptions): Promise<{ success: boolean; error?: string }> {
  const html = buildExportHtml(options);
  return new Promise((resolve) => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = typeof window !== 'undefined' ? window.open(url, '_blank') : null;
    if (!w) {
      URL.revokeObjectURL(url);
      resolve({ success: false, error: 'Popup blocked. Allow popups for this site and try again.' });
      return;
    }
    w.onload = () => {
      URL.revokeObjectURL(url);
      w.print();
      resolve({ success: true });
      w.onafterprint = () => w.close();
    };
    w.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ success: false, error: 'Failed to open print window.' });
    };
  });
}

export async function exportBinderToPdfAndShare(options: ExportOptions): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'web') {
    return exportOnWeb(options);
  }
  try {
    const { printToFileAsync } = await import('expo-print');
    const { shareAsync } = await import('expo-sharing');
    const html = buildExportHtml(options);
    const { uri } = await printToFileAsync({
      html,
      width: 595,
      height: 842,
      base64: false,
    });
    const canShare = await shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Export: ${options.binderName}`,
    });
    return { success: !!canShare };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { success: false, error: message };
  }
}
