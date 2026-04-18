export interface StudentSkill {
  skillName: string;
  yearsOfExperience: number;
}

export type EvaluationStatus = 'none' | 'pending' | 'ready' | 'failed';

export interface StudentAiEvaluationPreview {
  status: EvaluationStatus;
  overallScore: number | null;
  summarySnippet: string | null;
  lastAnalyzedAt: string | null;
}

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

export interface StudentContact {
  email: string;
  phone: string;
  location: string;
  linkedInUrl?: string;
  githubUrl?: string;
}

export interface Student {
  id: number;
  name: string;
  headline: string;
  contact: StudentContact;
  skills: StudentSkill[];
  seekingJob: boolean;
  seekingInternship: boolean;
  aiEvaluationPreview?: StudentAiEvaluationPreview;
  bio?: string;
  cvUrl?: string;
}

export interface Company {
  id: number;
  name: string;
  email: string;
  location: string;
  websiteUrl?: string;
}

export type WorkMode = 'Remote' | 'Hybrid' | 'On-site';
export type ApplicationStatus = 'APPLIED' | 'APPROVED' | 'HR_INTERVIEW' | 'TECHNICAL_INTERVIEW' | 'REJECTED';

export interface JobRequirement {
  skillName: string;
  minYears: number;
}

export interface JobPost {
  id: number;
  companyId: number;
  companyName: string;
  title: string;
  location: string;
  workMode: WorkMode;
  isJob: boolean;
  isInternship: boolean;
  description: string;
  requirements: JobRequirement[];
  postedAtIso: string;
}

export interface JobApplicationJobSummary {
  id: number;
  companyId: number;
  companyName: string;
  title: string;
  location: string;
  workMode: WorkMode;
  isJob: boolean;
  isInternship: boolean;
  postedAtIso: string;
}

export interface JobApplicationStudentSummary {
  id: number;
  name: string;
  email: string;
}

export interface JobApplication {
  id: number;
  status: ApplicationStatus;
  rejectionReason?: string;
  createdAtIso: string;
  updatedAtIso: string;
  job: JobApplicationJobSummary;
  student?: JobApplicationStudentSummary;
}

export interface EventItem {
  id: number;
  title: string;
  startsAtIso: string;
  location?: string;
  snippet?: string;
  sourceName: string;
  sourceUrl: string;
  eventUrl: string;
}
