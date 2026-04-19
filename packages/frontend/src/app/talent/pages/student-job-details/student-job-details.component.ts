import {ChangeDetectionStrategy, Component} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, combineLatest, map, of, shareReplay, startWith, Subject, switchMap} from 'rxjs';

import {ApplicationStatus, JobApplication, JobPost} from '../../models';
import {JobBoardService} from '../../services/job-board.service';

interface StudentJobDetailsVm {
  jobId: number;
  job: JobPost;
  application: JobApplication | null;
}

@Component({
  selector: 'app-student-job-details',
  templateUrl: './student-job-details.component.html',
  styleUrls: ['./student-job-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentJobDetailsComponent {
  private readonly reload$ = new Subject<void>();

  readonly jobId$ = this.route.paramMap.pipe(
    map((params) => Number(params.get('jobId'))),
    map((id) => (Number.isInteger(id) && id > 0 ? id : 0)),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  readonly vm$ = combineLatest([this.jobId$, this.reload$.pipe(startWith(undefined))]).pipe(
    switchMap(([jobId]) => {
      if (jobId <= 0) return of(null);

      return combineLatest([
        this.jobs.getStudentJobDetails(jobId).pipe(
          catchError((err: unknown) => {
            this.snackBar.open(this.toErrorMessage(err, 'Could not load job details.'), 'Dismiss', {duration: 3500});
            return of(null);
          }),
        ),
        this.jobs.getMyApplications().pipe(
          catchError((err: unknown) => {
            this.snackBar.open(this.toErrorMessage(err, 'Could not load your applications.'), 'Dismiss', {duration: 3500});
            return of([] as readonly JobApplication[]);
          }),
        ),
      ]).pipe(
        map(([details, applications]) => {
          if (!details) return null;
          const application = applications.find((app) => app.job.id === jobId) ?? null;
          return {
            jobId,
            job: details.job,
            application,
          } as StudentJobDetailsVm;
        }),
      );
    }),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  applying = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly jobs: JobBoardService,
    private readonly snackBar: MatSnackBar,
  ) {}

  trackRequirement = (_: number, requirement: JobPost['requirements'][number]) => requirement.skillName;

  listingTypeLabel(job: JobPost): string {
    const hasJob = !!job.isJob;
    const hasInternship = !!job.isInternship;
    if (hasJob && hasInternship) return 'Work + Internship';
    if (hasJob) return 'Work';
    if (hasInternship) return 'Internship';
    return 'Unspecified';
  }

  postedAtLabel(postedAtIso: string): string {
    const date = new Date(postedAtIso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: '2-digit'});
  }

  statusLabel(status: ApplicationStatus): string {
    switch (status) {
      case 'INVITED':
        return 'Invited';
      case 'APPLIED':
        return 'Applied';
      case 'APPROVED':
        return 'Approved';
      case 'HR_INTERVIEW':
        return 'HR Interview';
      case 'TECHNICAL_INTERVIEW':
        return 'Technical Interview';
      case 'DONE':
        return 'Done';
      case 'DECLINED':
        return 'Declined';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status;
    }
  }

  applyToJob(jobId: number, alreadyApplied: boolean): void {
    if (this.applying || alreadyApplied) return;
    this.applying = true;

    this.jobs.applyToJob(jobId).subscribe({
      next: () => {
        this.snackBar.open('Application submitted.', 'Dismiss', {duration: 2500});
        this.applying = false;
        this.reload$.next();
      },
      error: (err: unknown) => {
        this.snackBar.open(this.toErrorMessage(err, 'Could not apply to this job.'), 'Dismiss', {duration: 3500});
        this.applying = false;
      },
    });
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
