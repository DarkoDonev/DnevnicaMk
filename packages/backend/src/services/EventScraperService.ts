import {Event} from '../sequelize/models/Event';

export interface JobFairSourceConfig {
  name: string;
  url: string;
}

export interface ScrapeRunSummary {
  sources: number;
  processedCandidates: number;
  upserts: number;
  errors: string[];
}

export interface ScrapeSourceSummary {
  sourceName: string;
  scannedCandidates: number;
  matchedCandidates: number;
  upserts: number;
}

interface AnchorCandidate {
  title: string;
  eventUrl: string;
  context: string;
}

interface ExtractedEvent {
  sourceName: string;
  sourceUrl: string;
  eventUrl: string;
  title: string;
  startsAt: Date;
  location?: string | null;
  snippet?: string | null;
  dedupeKey: string;
}

const DEFAULT_JOB_FAIR_KEYWORDS = [
  'job fair',
  'career fair',
  'career day',
  'hiring event',
  'recruitment',
  'саем за вработување',
  'саем за кариера',
];

const MONTH_MAP: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
  јануари: 1,
  февруари: 2,
  март: 3,
  април: 4,
  мај: 5,
  јуни: 6,
  јули: 7,
  август: 8,
  септември: 9,
  октомври: 10,
  ноември: 11,
  декември: 12,
};

function normalizeWhitespace(input: string): string {
  return input
    .replace(/\s+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripHtml(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]*>/g, ' '));
}

function clip(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function cleanMonthToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[.,]/g, '')
    .trim();
}

function toSafeDate(year: number, month: number, day: number, hour = 9, minute = 0): Date | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1970 || year > 2100) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const d = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) return null;
  return d;
}

function inferYearForMonthDate(month: number, day: number, now: Date): number {
  const currentYear = now.getUTCFullYear();
  const thisYear = toSafeDate(currentYear, month, day);
  if (!thisYear) return currentYear;

  // Treat dates older than ~30 days as next-year events.
  const thirtyDaysMs = 1000 * 60 * 60 * 24 * 30;
  if (thisYear.getTime() < now.getTime() - thirtyDaysMs) return currentYear + 1;
  return currentYear;
}

export function parseDateFromText(input: string, now = new Date()): Date | null {
  const text = normalizeWhitespace(stripHtml(input));
  if (!text) return null;

  // YYYY-MM-DD or YYYY/MM/DD
  let m = text.match(/\b(20\d{2})[\/.\-](\d{1,2})[\/.\-](\d{1,2})(?:[^\d]+(\d{1,2})[:.](\d{2}))?\b/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const hour = m[4] ? Number(m[4]) : 9;
    const minute = m[5] ? Number(m[5]) : 0;
    const parsed = toSafeDate(year, month, day, hour, minute);
    if (parsed) return parsed;
  }

  // DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
  m = text.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})(?:[^\d]+(\d{1,2})[:.](\d{2}))?\b/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const yearRaw = Number(m[3]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const hour = m[4] ? Number(m[4]) : 9;
    const minute = m[5] ? Number(m[5]) : 0;
    const parsed = toSafeDate(year, month, day, hour, minute);
    if (parsed) return parsed;
  }

  // 12 October 2026
  m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z\u0400-\u04FF.]+)\s*,?\s*(20\d{2})\b/i);
  if (m) {
    const day = Number(m[1]);
    const month = MONTH_MAP[cleanMonthToken(m[2])];
    const year = Number(m[3]);
    if (month) {
      const parsed = toSafeDate(year, month, day);
      if (parsed) return parsed;
    }
  }

  // October 12, 2026
  m = text.match(/\b([A-Za-z\u0400-\u04FF.]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(20\d{2})\b/i);
  if (m) {
    const month = MONTH_MAP[cleanMonthToken(m[1])];
    const day = Number(m[2]);
    const year = Number(m[3]);
    if (month) {
      const parsed = toSafeDate(year, month, day);
      if (parsed) return parsed;
    }
  }

  // 12 October (no year)
  m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z\u0400-\u04FF.]+)\b/i);
  if (m) {
    const day = Number(m[1]);
    const month = MONTH_MAP[cleanMonthToken(m[2])];
    if (month) {
      const year = inferYearForMonthDate(month, day, now);
      const parsed = toSafeDate(year, month, day);
      if (parsed) return parsed;
    }
  }

  // October 12 (no year)
  m = text.match(/\b([A-Za-z\u0400-\u04FF.]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (m) {
    const month = MONTH_MAP[cleanMonthToken(m[1])];
    const day = Number(m[2]);
    if (month) {
      const year = inferYearForMonthDate(month, day, now);
      const parsed = toSafeDate(year, month, day);
      if (parsed) return parsed;
    }
  }

  return null;
}

function extractContext(html: string, from: number, length: number): string {
  const start = Math.max(0, from - 260);
  const end = Math.min(html.length, from + length + 260);
  return normalizeWhitespace(stripHtml(html.slice(start, end)));
}

export function extractAnchorCandidates(html: string, baseUrl: string): AnchorCandidate[] {
  const anchorRegex = /<a\b([^>]*?)>([\s\S]*?)<\/a>/gi;
  const out: AnchorCandidate[] = [];

  let match: RegExpExecArray | null = anchorRegex.exec(html);
  while (match) {
    const attrs = match[1] ?? '';
    const inner = match[2] ?? '';
    const hrefMatch = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+))/i);
    const hrefRaw = (hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? '').trim();
    const title = normalizeWhitespace(stripHtml(inner));

    if (hrefRaw && title.length >= 4) {
      try {
        const resolved = new URL(hrefRaw, baseUrl).toString();
        const context = extractContext(html, match.index, match[0].length);
        out.push({title, eventUrl: resolved, context});
      } catch {
        // Skip malformed urls.
      }
    }

    match = anchorRegex.exec(html);
  }

  return out;
}

export function parseKeywords(raw: string | undefined): string[] {
  const parsed = (raw ?? '')
    .split(',')
    .map((k) => normalizeWhitespace(k.toLowerCase()))
    .filter(Boolean);

  if (parsed.length > 0) {
    return Array.from(new Set(parsed));
  }

  return DEFAULT_JOB_FAIR_KEYWORDS;
}

function matchesKeywords(text: string, keywords: readonly string[]): boolean {
  const haystack = text.toLowerCase();
  return keywords.some((keyword) => keyword && haystack.includes(keyword));
}

export function parseSourcesFromEnv(raw: string | undefined): JobFairSourceConfig[] {
  if (!raw || !raw.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e: any) {
    throw new Error(`Invalid JOB_FAIR_SOURCES_JSON. ${e?.message ?? 'Failed to parse JSON.'}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('JOB_FAIR_SOURCES_JSON must be a JSON array.');
  }

  const sources: JobFairSourceConfig[] = [];
  for (const source of parsed) {
    if (!source || typeof source !== 'object') continue;
    const name = normalizeWhitespace(String((source as any).name ?? ''));
    const url = normalizeWhitespace(String((source as any).url ?? ''));
    if (!name || !url) continue;
    try {
      const normalized = new URL(url).toString();
      if (!/^https?:\/\//i.test(normalized)) continue;
      sources.push({name, url: normalized});
    } catch {
      // Skip invalid URLs.
    }
  }

  return sources;
}

function extractLocation(text: string): string | null {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return null;

  const patterns = [
    /(?:location|venue|place|address)\s*[:\-]\s*([^|;]{3,120})/i,
    /(?:локација|место|адреса)\s*[:\-]\s*([^|;]{3,120})/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return clip(match[1].trim(), 220);
    }
  }

  return null;
}

function normalizeEventUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    url.hash = '';

    const keys = Array.from(url.searchParams.keys());
    for (const key of keys) {
      const lower = key.toLowerCase();
      if (lower.startsWith('utm_') || lower === 'fbclid' || lower === 'gclid') {
        url.searchParams.delete(key);
      }
    }

    const sorted = Array.from(url.searchParams.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    url.search = '';
    for (const [k, v] of sorted) {
      url.searchParams.append(k, v);
    }

    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }

    return url.toString();
  } catch {
    return null;
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

export function buildDedupeKey(input: {
  sourceName: string;
  title: string;
  eventUrl: string;
  startsAt: Date;
}): string {
  const dateKey = input.startsAt.toISOString().slice(0, 10);
  const normalizedUrl = normalizeEventUrl(input.eventUrl);
  if (normalizedUrl) return `${normalizedUrl}|${dateKey}`;

  const sourcePart = slugify(input.sourceName) || 'source';
  const titlePart = slugify(input.title) || 'event';
  return `${sourcePart}|${titlePart}|${dateKey}`;
}

function buildSnippet(context: string, title: string): string | null {
  const normalized = normalizeWhitespace(context);
  if (!normalized) return null;

  const withoutTitle = normalizeWhitespace(normalized.replace(title, ''));
  if (!withoutTitle) return null;

  return clip(withoutTitle, 300);
}

export class EventScraperService {
  private readonly keywords = parseKeywords(process.env['JOB_FAIR_KEYWORDS']);

  getConfiguredSources(): JobFairSourceConfig[] {
    try {
      return parseSourcesFromEnv(process.env['JOB_FAIR_SOURCES_JSON']);
    } catch (e: any) {
      console.error('[events] Failed to load source config:', e?.message ?? e);
      return [];
    }
  }

  async syncFromConfiguredSources(): Promise<ScrapeRunSummary> {
    const sources = this.getConfiguredSources();
    if (sources.length === 0) {
      console.warn('[events] No valid sources configured. Skipping sync.');
      return {sources: 0, processedCandidates: 0, upserts: 0, errors: []};
    }

    const runSummary: ScrapeRunSummary = {
      sources: sources.length,
      processedCandidates: 0,
      upserts: 0,
      errors: [],
    };

    for (const source of sources) {
      try {
        const summary = await this.scrapeSource(source);
        runSummary.processedCandidates += summary.matchedCandidates;
        runSummary.upserts += summary.upserts;

        console.info(
          `[events] ${summary.sourceName}: scanned=${summary.scannedCandidates}, matched=${summary.matchedCandidates}, upserts=${summary.upserts}`,
        );
      } catch (e: any) {
        const msg = `[events] ${source.name} failed: ${e?.message ?? String(e)}`;
        runSummary.errors.push(msg);
        console.error(msg);
      }
    }

    return runSummary;
  }

  private async scrapeSource(source: JobFairSourceConfig): Promise<ScrapeSourceSummary> {
    const html = await this.fetchHtml(source.url);
    const candidates = extractAnchorCandidates(html, source.url);

    const matchedByDedupe = new Map<string, ExtractedEvent>();

    for (const candidate of candidates) {
      const textForFilter = `${candidate.title} ${candidate.context}`;
      if (!matchesKeywords(textForFilter, this.keywords)) continue;

      const startsAt = parseDateFromText(candidate.context) ?? parseDateFromText(candidate.title);
      if (!startsAt) continue;

      const title = clip(candidate.title, 260);
      const location = extractLocation(candidate.context);
      const snippet = buildSnippet(candidate.context, title);
      const dedupeKey = buildDedupeKey({
        sourceName: source.name,
        title,
        eventUrl: candidate.eventUrl,
        startsAt,
      });

      matchedByDedupe.set(dedupeKey, {
        sourceName: source.name,
        sourceUrl: source.url,
        eventUrl: candidate.eventUrl,
        title,
        startsAt,
        location,
        snippet,
        dedupeKey,
      });
    }

    let upserts = 0;
    const now = new Date();

    for (const event of matchedByDedupe.values()) {
      await this.upsertEvent(event, now);
      upserts += 1;
    }

    return {
      sourceName: source.name,
      scannedCandidates: candidates.length,
      matchedCandidates: matchedByDedupe.size,
      upserts,
    };
  }

  private async upsertEvent(event: ExtractedEvent, seenAt: Date): Promise<void> {
    const existing = await Event.findOne({where: {dedupeKey: event.dedupeKey}});

    if (!existing) {
      await Event.create({
        sourceName: event.sourceName,
        sourceUrl: event.sourceUrl,
        eventUrl: event.eventUrl,
        title: event.title,
        startsAt: event.startsAt,
        location: event.location ?? null,
        snippet: event.snippet ?? null,
        dedupeKey: event.dedupeKey,
        lastSeenAt: seenAt,
        companyId: null,
        createdByCompany: false,
      });
      return;
    }

    if (existing.createdByCompany) {
      return;
    }

    existing.sourceName = event.sourceName;
    existing.sourceUrl = event.sourceUrl;
    existing.eventUrl = event.eventUrl;
    existing.title = event.title;
    existing.startsAt = event.startsAt;
    existing.location = event.location ?? null;
    existing.snippet = event.snippet ?? null;
    existing.lastSeenAt = seenAt;
    await existing.save();
  }

  private async fetchHtml(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'user-agent': 'DnevnicaMkJobFairBot/1.0 (+https://dnevnicamk.local)',
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const ct = res.headers.get('content-type') ?? '';
      if (!ct.toLowerCase().includes('text/html')) {
        throw new Error(`Unsupported content type: ${ct || 'unknown'}`);
      }

      return await res.text();
    } finally {
      clearTimeout(timeout);
    }
  }
}
