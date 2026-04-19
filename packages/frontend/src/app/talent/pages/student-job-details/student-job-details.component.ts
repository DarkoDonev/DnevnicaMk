import {ChangeDetectionStrategy, Component} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, combineLatest, map, of, shareReplay, startWith, Subject, switchMap} from 'rxjs';

import {LocalizationService} from '../../../i18n/localization.service';
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
            this.snackBar.open(
              this.toErrorMessage(err, this.i18n.t('Could not load job details.')),
              this.i18n.t('Dismiss'),
              {duration: 3500},
            );
            return of(null);
          }),
        ),
        this.jobs.getMyApplications().pipe(
          catchError((err: unknown) => {
            this.snackBar.open(
              this.toErrorMessage(err, this.i18n.t('Could not load your applications.')),
              this.i18n.t('Dismiss'),
              {duration: 3500},
            );
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
    private readonly i18n: LocalizationService,
  ) {}

  trackRequirement = (_: number, requirement: JobPost['requirements'][number]) => requirement.skillName;

  listingTypeLabel(job: JobPost): string {
    const hasJob = !!job.isJob;
    const hasInternship = !!job.isInternship;
    if (hasJob && hasInternship) return this.i18n.t('Work + Internship');
    if (hasJob) return this.i18n.t('Work');
    if (hasInternship) return this.i18n.t('Internship');
    return this.i18n.t('Unspecified');
  }

  postedAtLabel(postedAtIso: string): string {
    const date = new Date(postedAtIso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(this.i18n.currentDateLocale, {year: 'numeric', month: 'short', day: '2-digit'});
  }

  statusLabel(status: ApplicationStatus): string {
    switch (status) {
      case 'INVITED':
        return this.i18n.t('Invited');
      case 'APPLIED':
        return this.i18n.t('Applied');
      case 'APPROVED':
        return this.i18n.t('Approved');
      case 'HR_INTERVIEW':
        return this.i18n.t('HR Interview');
      case 'TECHNICAL_INTERVIEW':
        return this.i18n.t('Technical Interview');
      case 'DONE':
        return this.i18n.t('Done');
      case 'DECLINED':
        return this.i18n.t('Declined');
      case 'REJECTED':
        return this.i18n.t('Rejected');
      default:
        return status;
    }
  }

  workModeLabel(mode: JobPost['workMode']): string {
    if (mode === 'Remote') return this.i18n.t('Remote');
    if (mode === 'Hybrid') return this.i18n.t('Hybrid');
    if (mode === 'On-site') return this.i18n.t('On-site');
    return mode;
  }

  applyToJob(jobId: number, alreadyApplied: boolean): void {
    if (this.applying || alreadyApplied) return;
    this.applying = true;

    this.jobs.applyToJob(jobId).subscribe({
      next: () => {
        this.snackBar.open(this.i18n.t('Application submitted.'), this.i18n.t('Dismiss'), {duration: 2500});
        this.applying = false;
        this.reload$.next();
      },
      error: (err: unknown) => {
        this.snackBar.open(
          this.toErrorMessage(err, this.i18n.t('Could not apply to this job.')),
          this.i18n.t('Dismiss'),
          {duration: 3500},
        );
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
