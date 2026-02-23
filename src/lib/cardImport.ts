/**
 * Parse card import file (CSV or XLSX) and return rows for bulk-adding to a binder.
 */

import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';

export interface CardImportRow {
  setId: string;
  cardNumber: string;
  language: string;
  variant: string;
}

const DEFAULT_LANG = 'en';
const DEFAULT_VARIANT = 'normal';

/** Normalize header for comparison (trim, lower case). */
function normHeader(h: string): string {
  return (h ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Parse a single row object (from CSV or sheet) into CardImportRow. */
function parseRow(raw: Record<string, unknown>): CardImportRow | null {
  const keys = Object.keys(raw);
  const setIdKey = keys.find((k) => normHeader(k) === 'set id' || normHeader(k) === 'setid');
  const numKey = keys.find(
    (k) =>
      normHeader(k) === 'card number' ||
      normHeader(k) === 'cardnumber' ||
      normHeader(k) === 'number' ||
      normHeader(k) === 'no'
  );
  const langKey = keys.find(
    (k) => normHeader(k) === 'language' || normHeader(k) === 'lang' || normHeader(k) === 'lang.'
  );
  const varKey = keys.find(
    (k) => normHeader(k) === 'variant' || normHeader(k) === 'var' || normHeader(k) === 'version'
  );

  const setId = setIdKey != null ? String(raw[setIdKey] ?? '').trim() : '';
  const cardNumber = numKey != null ? String(raw[numKey] ?? '').trim() : '';
  if (!setId || !cardNumber) return null;

  const language = langKey != null ? String(raw[langKey] ?? '').trim() || DEFAULT_LANG : DEFAULT_LANG;
  const variant = varKey != null ? String(raw[varKey] ?? '').trim() || DEFAULT_VARIANT : DEFAULT_VARIANT;

  return { setId, cardNumber, language, variant };
}

/**
 * Parse CSV text (comma-separated, first row = headers).
 */
export function parseCsvText(csvText: string): CardImportRow[] {
  const lines = csvText.split(/\r?\n/).map((line) => line.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows: CardImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const raw: Record<string, unknown> = {};
    headers.forEach((h, j) => {
      raw[h] = values[j] ?? '';
    });
    const row = parseRow(raw);
    if (row) rows.push(row);
  }

  return rows;
}

/**
 * Parse XLSX file from URI (Expo file URI). Reads as base64 and uses xlsx.
 */
export async function parseXlsxFromUri(uri: string): Promise<CardImportRow[]> {
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });
  const workbook = XLSX.read(b64, { type: 'base64' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const json = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
  const rows: CardImportRow[] = [];
  for (const obj of json) {
    const row = parseRow(obj);
    if (row) rows.push(row);
  }
  return rows;
}

/**
 * Parse CSV file from URI.
 */
export async function parseCsvFromUri(uri: string): Promise<CardImportRow[]> {
  const text = await FileSystem.readAsStringAsync(uri, {
    encoding: 'utf8',
  });
  return parseCsvText(text);
}

/**
 * Parse import file (CSV or XLSX) from URI. Detects by extension or MIME.
 */
export async function parseImportFile(uri: string, mimeType?: string): Promise<CardImportRow[]> {
  const lower = (uri + (mimeType ?? '')).toLowerCase();
  if (lower.includes('.xlsx') || lower.includes('spreadsheet') || lower.includes('excel')) {
    return parseXlsxFromUri(uri);
  }
  return parseCsvFromUri(uri);
}

/** Build TCGdex card id from set id and card number. */
export function rowToCardId(row: CardImportRow): string {
  return `${row.setId}-${row.cardNumber}`;
}

/** Valid variant values from sheet. */
const VARIANT_MAP: Record<string, 'normal' | 'reverse' | 'holo' | 'firstEdition' | 'wPromo'> = {
  normal: 'normal',
  reverse: 'reverse',
  holo: 'holo',
  firstedition: 'firstEdition',
  '1stedition': 'firstEdition',
  '1st': 'firstEdition',
  first: 'firstEdition',
  wpromo: 'wPromo',
  w: 'wPromo',
};

/** Normalize variant string from sheet to a valid CardVariant. Defaults to 'normal'. */
export function normalizeVariantFromSheet(v: string): 'normal' | 'reverse' | 'holo' | 'firstEdition' | 'wPromo' {
  const key = (v ?? '').trim().toLowerCase().replace(/\s+/g, '');
  return VARIANT_MAP[key] ?? 'normal';
}
