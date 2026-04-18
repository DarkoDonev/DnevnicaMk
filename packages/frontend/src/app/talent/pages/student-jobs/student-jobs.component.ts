import {ChangeDetectionStrategy, Component} from '@angular/core';
import {NonNullableFormBuilder} from '@angular/forms';
import {HttpErrorResponse} from '@angular/common/http';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, combineLatest, map, of, shareReplay, startWith, Subject, switchMap} from 'rxjs';

import {JobBoardService} from '../../services/job-board.service';
import {ApplicationStatus, JobApplication, JobPost, WorkMode} from '../../models';
import {TechSkillsService} from '../../services/tech-skills.service';

type WorkModeFilter = 'Any' | WorkMode;

interface FiltersValue {
  query: string;
  skills: string[];
  workMode: WorkModeFilter;
  includeJobs: boolean;
  includeInternships: boolean;
}

@Component({
  selector: 'app-student-jobs',
  templateUrl: './student-jobs.component.html',
  styleUrls: ['./student-jobs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentJobsComponent {
  private readonly applicationsReload$ = new Subject<void>();

  readonly skills$ = this.skillService.getSkills().pipe(
    map((r) => r.data),
    shareReplay({bufferSize: 1, refCount: true}),
  );
  readonly workModeOptions: readonly WorkModeFilter[] = ['Any', 'Remote', 'Hybrid', 'On-site'];

  readonly filters = this.fb.group({
    query: this.fb.control(''),
    skills: this.fb.control<string[]>([]),
    workMode: this.fb.control<WorkModeFilter>('Any'),
    includeJobs: this.fb.control(true),
    includeInternships: this.fb.control(true),
  });

  readonly jobs$ = this.jobs.getJobs().pipe(shareReplay({bufferSize: 1, refCount: true}));
  readonly myApplications$ = this.applicationsReload$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.jobs.getMyApplications().pipe(
        catchError((err: unknown) => {
          const msg = this.toErrorMessage(err, 'Could not load your applications.');
          this.snackBar.open(msg, 'Dismiss', {duration: 3500});
          return of([] as readonly JobApplication[]);
        }),
      ),
    ),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  readonly filteredJobs$ = combineLatest([
    this.jobs$,
    this.filters.valueChanges.pipe(startWith(this.filters.getRawValue())),
  ]).pipe(
    map(([jobs, filters]) => this.applyFilters(jobs, filters as FiltersValue)),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  readonly jobsVm$ = combineLatest([this.filteredJobs$, this.myApplications$]).pipe(
    map(([jobs, applications]) => {
      const applicationByJobId = new Map<number, JobApplication>();
      for (const app of applications) {
        applicationByJobId.set(app.job.id, app);
      }
      return {jobs, applicationByJobId};
    }),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  applyingJobId: number | null = null;

  constructor(
    private readonly fb: NonNullableFormBuilder,
    private readonly jobs: JobBoardService,
    private readonly skillService: TechSkillsService,
    private readonly snackBar: MatSnackBar,
  ) {}

  trackJob = (_: number, j: JobPost) => j.id;

  clearFilters(): void {
    this.filters.setValue({query: '', skills: [], workMode: 'Any', includeJobs: true, includeInternships: true});
  }

  statusLabel(status: ApplicationStatus): string {
    switch (status) {
      case 'APPLIED':
        return 'Applied';
      case 'APPROVED':
        return 'Approved';
      case 'HR_INTERVIEW':
        return 'HR Interview';
      case 'TECHNICAL_INTERVIEW':
        return 'Technical Interview';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status;
    }
  }

  applyToJob(jobId: number, alreadyApplied: boolean): void {
    if (this.applyingJobId !== null || alreadyApplied) return;
    this.applyingJobId = jobId;

    this.jobs.applyToJob(jobId).subscribe({
      next: () => {
        this.snackBar.open('Application submitted.', 'Dismiss', {duration: 2500});
        this.applyingJobId = null;
        this.applicationsReload$.next();
      },
      error: (err: unknown) => {
        const msg = this.toErrorMessage(err, 'Could not apply to this job.');
        this.snackBar.open(msg, 'Dismiss', {duration: 3500});
        this.applyingJobId = null;
      },
    });
  }

  private applyFilters(jobs: readonly JobPost[], filters: FiltersValue): readonly JobPost[] {
    const query = (filters.query ?? '').trim().toLowerCase();
    const skills = (filters.skills ?? []).filter(Boolean);
    const workMode = filters.workMode ?? 'Any';
    const includeJobs = filters.includeJobs ?? true;
    const includeInternships = filters.includeInternships ?? true;

    const matchesQuery = (j: JobPost): boolean => {
      if (!query) return true;
      const haystack = [
        j.title,
        j.companyName,
        j.location,
        j.workMode,
        j.isJob ? 'work' : '',
        j.isInternship ? 'internship' : '',
        j.description,
        ...j.requirements.map((r) => r.skillName),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    };

    const matchesSkills = (j: JobPost): boolean => {
      if (skills.length === 0) return true;
      return j.requirements.some((r) => skills.includes(r.skillName));
    };

    const matchesMode = (j: JobPost): boolean => {
      if (workMode === 'Any') return true;
      return j.workMode === workMode;
    };

    const matchesType = (j: JobPost): boolean => {
      if (includeJobs && includeInternships) return true;
      if (!includeJobs && !includeInternships) return !j.isJob && !j.isInternship;
      const wantsJob = includeJobs && !!j.isJob;
      const wantsInternship = includeInternships && !!j.isInternship;
      return wantsJob || wantsInternship;
    };

    return jobs
      .filter((j) => matchesQuery(j) && matchesSkills(j) && matchesMode(j) && matchesType(j))
      .slice()
      .sort((a, b) => b.postedAtIso.localeCompare(a.postedAtIso));
  }

  private toErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && typeof err.error?.message === 'string') {
      return err.error.message;
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallback;
  }
}
