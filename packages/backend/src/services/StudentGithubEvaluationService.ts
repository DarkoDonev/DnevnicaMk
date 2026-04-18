import {BadRequestError, NotFoundError} from 'routing-controllers';

import {Student} from '../sequelize/models/Student';
import {StudentGithubEvaluation} from '../sequelize/models/StudentGithubEvaluation';

export type EvaluationStatus = 'none' | 'pending' | 'ready' | 'failed';

export interface StudentAiEvaluationScores {
  overall: number | null;
  codeQuality: number | null;
  consistency: number | null;
  activity: number | null;
  documentation: number | null;
}

export interface StudentAiEvaluationRepoSummary {
  name: string;
  fullName: string;
  htmlUrl: string;
  stars: number;
  pushedAt: string | null;
  commitsInWindow: number;
  hasReadme: boolean;
  hasTests: boolean;
  primaryLanguage: string | null;
}

export interface StudentAiEvaluationMetrics {
  commitWindowDays: number;
  commitWindowStartIso: string;
  commitWindowEndIso: string;
  commitCount: number;
  activeWeeks: number;
  averageCommitsPerWeek: number;
  activitySpread: number;
  repositoriesAnalyzed: number;
  repositoriesWithRecentCommits: number;
  readmeCoverage: number;
  testCoverage: number;
  languageMix: Array<{language: string; percentage: number}>;
}

export interface StudentAiEvaluationDetails {
  status: EvaluationStatus;
  lastAnalyzedAt: string | null;
  scores: StudentAiEvaluationScores;
  summaryMk: string | null;
  reposAnalyzed: StudentAiEvaluationRepoSummary[];
  metrics: StudentAiEvaluationMetrics | null;
  strengths: string[];
  improvements: string[];
  lastError: string | null;
}

export interface StudentAiEvaluationRunResult extends StudentAiEvaluationDetails {
  fromCache: boolean;
}

export interface StudentAiEvaluationPreview {
  status: EvaluationStatus;
  overallScore: number | null;
  summarySnippet: string | null;
  lastAnalyzedAt: string | null;
}

interface GithubRepo {
  name: string;
  full_name: string;
  html_url: string;
  fork: boolean;
  archived: boolean;
  stargazers_count: number;
  pushed_at: string | null;
  language: string | null;
  owner: {login: string};
}

interface GithubCommitItem {
  sha: string;
  commit?: {
    author?: {
      date?: string;
    };
  };
}

interface GithubContentItem {
  type: 'file' | 'dir';
  name: string;
  path: string;
  size?: number;
  download_url?: string | null;
}

interface RepoCollectedData {
  name: string;
  fullName: string;
  htmlUrl: string;
  stars: number;
  pushedAt: string | null;
  primaryLanguage: string | null;
  commitsInWindow: number;
  hasReadme: boolean;
  hasTests: boolean;
  languages: Record<string, number>;
  snippetCandidates: Array<{path: string; content: string}>;
  activeWeekKeys: string[];
}

interface GeminiAnalysis {
  summaryMk: string;
  codeQuality: number;
  documentation: number;
  strengths: string[];
  improvements: string[];
}

const GITHUB_API_BASE = 'https://api.github.com';
const SUPPORTED_CODE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'py',
  'java',
  'go',
  'rb',
  'php',
  'cs',
  'cpp',
  'c',
  'h',
  'swift',
  'kt',
  'rs',
]);

const TEST_PATH_REGEX = /(^|\/)__tests__($|\/)|(^|\/)tests?($|\/)|(^|\/)specs?($|\/)|(^|\/).*\.(test|spec)\.[^/]+$/i;

export class StudentGithubEvaluationService {
  private readonly cacheTtlHours = this.readEnvInt('AI_EVAL_CACHE_TTL_HOURS', 24, 1, 168);
  private readonly repoLimit = this.readEnvInt('AI_EVAL_REPO_LIMIT', 5, 1, 10);
  private readonly commitWindowDays = this.readEnvInt('AI_EVAL_COMMIT_WINDOW_DAYS', 90, 7, 365);
  private readonly geminiModel = process.env['GEMINI_MODEL']?.trim() || 'gemini-2.5-flash';
  private readonly geminiApiKey = process.env['GEMINI_API_KEY']?.trim() || '';
  private readonly githubToken = process.env['GITHUB_TOKEN']?.trim() || '';

  async runForCompany(studentId: number, force: boolean): Promise<StudentAiEvaluationRunResult> {
    const student = await Student.findByPk(studentId);
    if (!student) throw new NotFoundError('Student not found.');

    const githubUrl = (student.githubUrl ?? '').trim();
    if (!githubUrl) {
      await this.upsertFailed(student.id, 'Student does not have a GitHub profile URL.');
      throw new BadRequestError('Student does not have a GitHub profile URL.');
    }

    const parsed = this.parseGithubProfileUrl(githubUrl);

    const now = new Date();
    let record = await StudentGithubEvaluation.findOne({where: {studentId: student.id}});

    if (
      record &&
      !force &&
      record.status === 'ready' &&
      record.cacheExpiresAt instanceof Date &&
      record.cacheExpiresAt.getTime() > now.getTime()
    ) {
      return {
        ...this.toDetails(record),
        fromCache: true,
      };
    }

    if (!record) {
      record = await StudentGithubEvaluation.create({
        studentId: student.id,
        status: 'pending',
        lastError: null,
      });
    } else {
      record.status = 'pending';
      record.lastError = null;
      await record.save();
    }

    try {
      const computed = await this.computeEvaluation(parsed.username);
      const cacheExpiresAt = new Date(now.getTime() + this.cacheTtlHours * 60 * 60 * 1000);

      record.status = 'ready';
      record.overallScore = computed.scores.overall;
      record.codeQualityScore = computed.scores.codeQuality;
      record.consistencyScore = computed.scores.consistency;
      record.activityScore = computed.scores.activity;
      record.documentationScore = computed.scores.documentation;
      record.summaryMk = computed.summaryMk;
      record.strengthsJson = JSON.stringify(computed.strengths);
      record.improvementsJson = JSON.stringify(computed.improvements);
      record.reposAnalyzedJson = JSON.stringify(computed.reposAnalyzed);
      record.metricsJson = JSON.stringify(computed.metrics);
      record.lastAnalyzedAt = now;
      record.cacheExpiresAt = cacheExpiresAt;
      record.lastError = null;
      await record.save();

      return {
        ...this.toDetails(record),
        fromCache: false,
      };
    } catch (error) {
      const message = this.toSafeError(error);
      await this.upsertFailed(student.id, message);

      const failed = await StudentGithubEvaluation.findOne({where: {studentId: student.id}});
      return {
        ...this.toDetails(failed ?? null),
        fromCache: false,
      };
    }
  }

  async getForCompany(studentId: number): Promise<StudentAiEvaluationDetails> {
    const student = await Student.findByPk(studentId);
    if (!student) throw new NotFoundError('Student not found.');

    const record = await StudentGithubEvaluation.findOne({where: {studentId: student.id}});
    return this.toDetails(record ?? null);
  }

  async getForStudentUser(userId: number): Promise<StudentAiEvaluationDetails> {
    const student = await Student.findOne({where: {userId}});
    if (!student) throw new NotFoundError('Student not found.');

    const record = await StudentGithubEvaluation.findOne({where: {studentId: student.id}});
    return this.toDetails(record ?? null);
  }

  previewFromRecord(record: StudentGithubEvaluation | null | undefined): StudentAiEvaluationPreview {
    if (!record) {
      return {
        status: 'none',
        overallScore: null,
        summarySnippet: null,
        lastAnalyzedAt: null,
      };
    }

    const status = record.status as EvaluationStatus;
    return {
      status,
      overallScore: record.overallScore ?? null,
      summarySnippet: this.summarySnippet(record.summaryMk ?? null),
      lastAnalyzedAt: record.lastAnalyzedAt ? record.lastAnalyzedAt.toISOString() : null,
    };
  }

  private async computeEvaluation(username: string): Promise<{
    scores: StudentAiEvaluationScores;
    summaryMk: string;
    strengths: string[];
    improvements: string[];
    reposAnalyzed: StudentAiEvaluationRepoSummary[];
    metrics: StudentAiEvaluationMetrics;
  }> {
    const repos = await this.fetchCandidateRepos(username);
    if (repos.length === 0) {
      throw new Error('No public non-fork repositories found for this profile.');
    }

    const since = new Date(Date.now() - this.commitWindowDays * 24 * 60 * 60 * 1000);
    const repoData = await this.collectRepoData(repos, since);

    const metrics = this.buildMetrics(repoData, since);
    const deterministic = this.buildDeterministicScores(metrics);

    const gemini = await this.callGeminiAnalysis({
      username,
      metrics,
      repos: repoData,
      windowDays: this.commitWindowDays,
    });

    const scores: StudentAiEvaluationScores = {
      codeQuality: gemini.codeQuality,
      documentation: gemini.documentation,
      activity: deterministic.activity,
      consistency: deterministic.consistency,
      overall: this.clampScore(
        Math.round(
          gemini.codeQuality * 0.4 +
            deterministic.consistency * 0.2 +
            deterministic.activity * 0.2 +
            gemini.documentation * 0.2,
        ),
      ),
    };

    const reposAnalyzed: StudentAiEvaluationRepoSummary[] = repoData.map((repo) => ({
      name: repo.name,
      fullName: repo.fullName,
      htmlUrl: repo.htmlUrl,
      stars: repo.stars,
      pushedAt: repo.pushedAt,
      commitsInWindow: repo.commitsInWindow,
      hasReadme: repo.hasReadme,
      hasTests: repo.hasTests,
      primaryLanguage: repo.primaryLanguage,
    }));

    return {
      scores,
      summaryMk: gemini.summaryMk,
      strengths: gemini.strengths,
      improvements: gemini.improvements,
      reposAnalyzed,
      metrics,
    };
  }

  private async fetchCandidateRepos(username: string): Promise<GithubRepo[]> {
    const repos = await this.githubJson<GithubRepo[]>(
      `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos?type=owner&sort=pushed&per_page=100&page=1`,
      {notFoundMessage: 'GitHub profile was not found.'},
    );

    const filtered = repos.filter((repo) => !repo.fork && !repo.archived);
    filtered.sort((a, b) => {
      const pushedDelta = (b.pushed_at ? new Date(b.pushed_at).getTime() : 0) - (a.pushed_at ? new Date(a.pushed_at).getTime() : 0);
      if (pushedDelta !== 0) return pushedDelta;
      return (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0);
    });

    return filtered.slice(0, this.repoLimit);
  }

  private async collectRepoData(repos: GithubRepo[], since: Date): Promise<RepoCollectedData[]> {
    const out: RepoCollectedData[] = [];
    for (const repo of repos) {
      const owner = repo.owner.login;
      const repoName = repo.name;

      const [commitData, hasReadme, rootContents, languages] = await Promise.all([
        this.fetchRepoCommits(owner, repoName, since),
        this.fetchHasReadme(owner, repoName),
        this.fetchRootContents(owner, repoName),
        this.fetchRepoLanguages(owner, repoName),
      ]);

      const hasTests = rootContents.some((item) => TEST_PATH_REGEX.test(item.path.toLowerCase()));
      const snippetCandidates = await this.fetchSnippetCandidates(rootContents, 2);

      out.push({
        name: repo.name,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        stars: repo.stargazers_count ?? 0,
        pushedAt: repo.pushed_at,
        primaryLanguage: repo.language,
        commitsInWindow: commitData.commitCount,
        hasReadme,
        hasTests,
        languages,
        snippetCandidates,
        activeWeekKeys: Array.from(commitData.activeWeekKeys),
      });
    }

    return out;
  }

  private buildMetrics(repos: RepoCollectedData[], since: Date): StudentAiEvaluationMetrics {
    const commitWindowWeeks = Math.max(1, Math.ceil(this.commitWindowDays / 7));

    const allActiveWeeks = new Set<string>();
    let commitCount = 0;
    let reposWithRecentCommits = 0;
    let reposWithReadme = 0;
    let reposWithTests = 0;
    const languageBytes = new Map<string, number>();

    for (const repo of repos) {
      commitCount += repo.commitsInWindow;
      if (repo.commitsInWindow > 0) reposWithRecentCommits += 1;
      if (repo.hasReadme) reposWithReadme += 1;
      if (repo.hasTests) reposWithTests += 1;

      for (const wk of repo.activeWeekKeys) {
        allActiveWeeks.add(wk);
      }

      for (const [language, bytes] of Object.entries(repo.languages)) {
        languageBytes.set(language, (languageBytes.get(language) ?? 0) + bytes);
      }
    }

    const languageTotal = Array.from(languageBytes.values()).reduce((a, b) => a + b, 0);
    const languageMix = Array.from(languageBytes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([language, bytes]) => ({
        language,
        percentage: languageTotal > 0 ? Number(((bytes / languageTotal) * 100).toFixed(1)) : 0,
      }));

    return {
      commitWindowDays: this.commitWindowDays,
      commitWindowStartIso: since.toISOString(),
      commitWindowEndIso: new Date().toISOString(),
      commitCount,
      activeWeeks: allActiveWeeks.size,
      averageCommitsPerWeek: Number((commitCount / commitWindowWeeks).toFixed(2)),
      activitySpread: Number((repos.length > 0 ? reposWithRecentCommits / repos.length : 0).toFixed(4)),
      repositoriesAnalyzed: repos.length,
      repositoriesWithRecentCommits: reposWithRecentCommits,
      readmeCoverage: Number((repos.length > 0 ? reposWithReadme / repos.length : 0).toFixed(4)),
      testCoverage: Number((repos.length > 0 ? reposWithTests / repos.length : 0).toFixed(4)),
      languageMix,
    };
  }

  private buildDeterministicScores(metrics: StudentAiEvaluationMetrics): {activity: number; consistency: number} {
    if (metrics.commitCount <= 0) {
      return {
        activity: 0,
        consistency: 0,
      };
    }

    const weeks = Math.max(1, Math.ceil(this.commitWindowDays / 7));
    const activeWeeksRatio = this.clamp01(metrics.activeWeeks / weeks);
    const spreadPercent = metrics.activitySpread * 100;

    const avgWeeklyNormalized = this.clampScore(Math.round((metrics.averageCommitsPerWeek / 6) * 100));
    const volumeNormalized = this.clampScore(Math.round((metrics.commitCount / 120) * 100));

    const activity = this.clampScore(Math.round(avgWeeklyNormalized * 0.45 + spreadPercent * 0.35 + volumeNormalized * 0.2));
    const consistency = this.clampScore(Math.round(activeWeeksRatio * 100 * 0.7 + spreadPercent * 0.3));

    return {
      activity,
      consistency,
    };
  }

  private async callGeminiAnalysis(input: {
    username: string;
    metrics: StudentAiEvaluationMetrics;
    repos: RepoCollectedData[];
    windowDays: number;
  }): Promise<GeminiAnalysis> {
    if (!this.geminiApiKey) {
      throw new Error('Missing GEMINI_API_KEY environment variable.');
    }

    const snippetPayload = input.repos
      .flatMap((repo) =>
        repo.snippetCandidates.map((snippet) => ({
          repo: repo.fullName,
          path: snippet.path,
          content: snippet.content,
        })),
      )
      .slice(0, 10);

    const repoPayload = input.repos.map((repo) => ({
      fullName: repo.fullName,
      stars: repo.stars,
      primaryLanguage: repo.primaryLanguage,
      commitsInWindow: repo.commitsInWindow,
      hasReadme: repo.hasReadme,
      hasTests: repo.hasTests,
    }));

    const prompt = [
      'Ти си технички евалуатор за junior/mid software candidates.',
      'Врати САМО JSON објект без markdown или дополнителен текст.',
      'Јазик: македонски.',
      'Задача: кратка и искрена AI евалуација на coding style и документација за GitHub профил, користејќи ги дадените податоци.',
      'Ако има малку сигнал (мало количество код/commit), експлицитно кажи го тоа во summaryMk.',
      'JSON schema:',
      '{',
      '  "summaryMk": string,',
      '  "codeQuality": integer 0-100,',
      '  "documentation": integer 0-100,',
      '  "strengths": string[1..5],',
      '  "improvements": string[1..5]',
      '}',
      '',
      `Контекст:`,
      JSON.stringify(
        {
          username: input.username,
          windowDays: input.windowDays,
          metrics: input.metrics,
          repos: repoPayload,
          snippets: snippetPayload,
        },
        null,
        2,
      ),
    ].join('\n');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.geminiModel)}:generateContent?key=${encodeURIComponent(this.geminiApiKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{role: 'user', parts: [{text: prompt}]}],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${text.slice(0, 300)}`);
    }

    const payload = (await response.json()) as any;
    const text: string =
      payload?.candidates?.[0]?.content?.parts
        ?.map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
        .join('')
        .trim() ?? '';

    if (!text) {
      throw new Error('Gemini returned empty response.');
    }

    const normalized = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(normalized);
    } catch {
      throw new Error('Gemini response is not valid JSON.');
    }

    return {
      summaryMk: typeof parsed?.summaryMk === 'string' ? parsed.summaryMk.trim() : '',
      codeQuality: this.clampScore(Number(parsed?.codeQuality ?? 0)),
      documentation: this.clampScore(Number(parsed?.documentation ?? 0)),
      strengths: this.toStringArray(parsed?.strengths, 5),
      improvements: this.toStringArray(parsed?.improvements, 5),
    };
  }

  private async fetchRepoCommits(owner: string, repo: string, since: Date): Promise<{commitCount: number; activeWeekKeys: Set<string>}> {
    let page = 1;
    let commitCount = 0;
    const activeWeekKeys = new Set<string>();

    while (page <= 10) {
      const commits = await this.githubJson<GithubCommitItem[]>(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?since=${encodeURIComponent(
          since.toISOString(),
        )}&per_page=100&page=${page}`,
        {notFoundMessage: null},
      );

      if (!Array.isArray(commits) || commits.length === 0) break;

      commitCount += commits.length;
      for (const c of commits) {
        const iso = c?.commit?.author?.date;
        if (!iso) continue;
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) continue;
        activeWeekKeys.add(this.isoWeekKey(d));
      }

      if (commits.length < 100) break;
      page += 1;
    }

    return {commitCount, activeWeekKeys};
  }

  private async fetchHasReadme(owner: string, repo: string): Promise<boolean> {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`, {
      headers: this.githubHeaders(),
    });
    if (res.status === 404) return false;
    if (!res.ok) return false;
    return true;
  }

  private async fetchRootContents(owner: string, repo: string): Promise<GithubContentItem[]> {
    const contents = await this.githubJson<GithubContentItem[] | GithubContentItem>(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents`,
      {notFoundMessage: null},
    );

    if (!Array.isArray(contents)) return [];
    return contents;
  }

  private async fetchRepoLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    const languages = await this.githubJson<Record<string, number>>(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`,
      {notFoundMessage: null},
    );

    if (!languages || typeof languages !== 'object') return {};
    return languages;
  }

  private async fetchSnippetCandidates(
    contents: GithubContentItem[],
    limit: number,
  ): Promise<Array<{path: string; content: string}>> {
    const candidates = contents
      .filter((item) => item.type === 'file')
      .filter((item) => !!item.download_url)
      .filter((item) => (item.size ?? 0) > 0 && (item.size ?? 0) <= 24_000)
      .filter((item) => this.isCodeFile(item.path))
      .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
      .slice(0, limit);

    const snippets: Array<{path: string; content: string}> = [];
    for (const file of candidates) {
      const content = await this.fetchTextFile(file.download_url!);
      if (!content) continue;
      snippets.push({
        path: file.path,
        content: content.slice(0, 700),
      });
    }

    return snippets;
  }

  private async fetchTextFile(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, {headers: this.githubHeaders()});
      if (!res.ok) return null;
      const text = await res.text();
      if (!text || text.length < 40) return null;
      return text;
    } catch {
      return null;
    }
  }

  private isCodeFile(path: string): boolean {
    const idx = path.lastIndexOf('.');
    if (idx < 0) return false;
    const ext = path.slice(idx + 1).toLowerCase();
    return SUPPORTED_CODE_EXTENSIONS.has(ext);
  }

  private parseGithubProfileUrl(rawUrl: string): {username: string} {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestError('GitHub URL must be in profile format: https://github.com/<username>.');
    }

    const hostname = url.hostname.toLowerCase();
    if (hostname !== 'github.com' && hostname !== 'www.github.com') {
      throw new BadRequestError('GitHub URL must be in profile format: https://github.com/<username>.');
    }

    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length !== 1) {
      throw new BadRequestError('GitHub URL must be in profile format: https://github.com/<username>.');
    }

    const username = segments[0];
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/.test(username)) {
      throw new BadRequestError('GitHub username in URL is invalid.');
    }

    return {username};
  }

  private async githubJson<T>(url: string, opts: {notFoundMessage: string | null}): Promise<T> {
    const res = await fetch(url, {headers: this.githubHeaders()});

    if (res.status === 404 && opts.notFoundMessage) {
      throw new BadRequestError(opts.notFoundMessage);
    }

    if (!res.ok) {
      const text = await res.text();
      const rateRemaining = res.headers.get('x-ratelimit-remaining');
      const rateReset = res.headers.get('x-ratelimit-reset');

      let suffix = '';
      if (rateRemaining === '0' && rateReset) {
        const resetMs = Number(rateReset) * 1000;
        const resetAt = Number.isFinite(resetMs) ? new Date(resetMs).toISOString() : rateReset;
        suffix = ` GitHub rate limit exceeded. Reset at ${resetAt}.`;
      }

      throw new Error(`GitHub API error (${res.status}). ${text.slice(0, 280)}${suffix}`);
    }

    return (await res.json()) as T;
  }

  private githubHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'DnevnicaMk-AI-Evaluator',
    };

    if (this.githubToken) {
      headers['Authorization'] = `Bearer ${this.githubToken}`;
    }

    return headers;
  }

  private toDetails(record: StudentGithubEvaluation | null): StudentAiEvaluationDetails {
    if (!record) {
      return {
        status: 'none',
        lastAnalyzedAt: null,
        scores: {
          overall: null,
          codeQuality: null,
          consistency: null,
          activity: null,
          documentation: null,
        },
        summaryMk: null,
        reposAnalyzed: [],
        metrics: null,
        strengths: [],
        improvements: [],
        lastError: null,
      };
    }

    return {
      status: record.status as EvaluationStatus,
      lastAnalyzedAt: record.lastAnalyzedAt ? record.lastAnalyzedAt.toISOString() : null,
      scores: {
        overall: record.overallScore ?? null,
        codeQuality: record.codeQualityScore ?? null,
        consistency: record.consistencyScore ?? null,
        activity: record.activityScore ?? null,
        documentation: record.documentationScore ?? null,
      },
      summaryMk: record.summaryMk ?? null,
      reposAnalyzed: this.parseJson<StudentAiEvaluationRepoSummary[]>(record.reposAnalyzedJson, []),
      metrics: this.parseJson<StudentAiEvaluationMetrics | null>(record.metricsJson, null),
      strengths: this.parseJson<string[]>(record.strengthsJson, []),
      improvements: this.parseJson<string[]>(record.improvementsJson, []),
      lastError: record.lastError ?? null,
    };
  }

  private parseJson<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private summarySnippet(summary: string | null): string | null {
    if (!summary) return null;
    const trimmed = summary.trim();
    if (!trimmed) return null;
    if (trimmed.length <= 180) return trimmed;
    return `${trimmed.slice(0, 177)}...`;
  }

  private toStringArray(input: unknown, maxItems: number): string[] {
    if (!Array.isArray(input)) return [];
    return input
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .slice(0, maxItems);
  }

  private isoWeekKey(date: Date): string {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  private clampScore(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }

  private readEnvInt(name: string, fallback: number, min: number, max: number): number {
    const raw = process.env[name];
    if (!raw) return fallback;

    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return fallback;
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  private toSafeError(error: unknown): string {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      return error.message;
    }
    if (error instanceof Error && error.message) {
      return error.message.slice(0, 800);
    }
    return 'Evaluation failed due to an unexpected error.';
  }

  private async upsertFailed(studentId: number, message: string): Promise<void> {
    const now = new Date();
    const record = await StudentGithubEvaluation.findOne({where: {studentId}});

    if (!record) {
      await StudentGithubEvaluation.create({
        studentId,
        status: 'failed',
        lastError: message,
        lastAnalyzedAt: now,
        cacheExpiresAt: null,
      });
      return;
    }

    record.status = 'failed';
    record.lastError = message;
    record.lastAnalyzedAt = now;
    record.cacheExpiresAt = null;
    record.overallScore = null;
    record.codeQualityScore = null;
    record.consistencyScore = null;
    record.activityScore = null;
    record.documentationScore = null;
    record.summaryMk = null;
    record.strengthsJson = JSON.stringify([]);
    record.improvementsJson = JSON.stringify([]);
    record.reposAnalyzedJson = JSON.stringify([]);
    record.metricsJson = null;
    await record.save();
  }
}
