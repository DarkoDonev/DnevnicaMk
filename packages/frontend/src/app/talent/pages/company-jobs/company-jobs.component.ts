import {ChangeDetectionStrategy, Component} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, map, of, shareReplay, startWith, Subject, switchMap} from 'rxjs';

import {JobPost} from '../../models';
import {JobBoardService} from '../../services/job-board.service';
import {NewJobPostDialogComponent} from './new-job-post-dialog.component';

@Component({
  selector: 'app-company-jobs',
  templateUrl: './company-jobs.component.html',
  styleUrls: ['./company-jobs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyJobsComponent {
  private readonly reload$ = new Subject<void>();

  readonly jobs$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() => this.jobs.getCompanyJobs()),
    map((jobs) => jobs.slice().sort((a, b) => b.postedAtIso.localeCompare(a.postedAtIso))),
    catchError((err: unknown) => {
      const msg = this.toErrorMessage(err, 'Could not load jobs.');
      this.snackBar.open(msg, 'Dismiss', {duration: 3500});
      return of([] as readonly JobPost[]);
    }),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  constructor(
    private readonly jobs: JobBoardService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
  ) {}

  trackJob = (_: number, job: JobPost) => job.id;

  openNewJobModal(): void {
    const dialogRef = this.dialog.open(NewJobPostDialogComponent, {
      width: '780px',
      maxWidth: '96vw',
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result: unknown) => {
      if (result === true) {
        this.snackBar.open('Job posted.', 'Dismiss', {duration: 2500});
        this.reload$.next();
        return;
      }

      if (result && typeof result === 'object' && typeof (result as any).error === 'string') {
        this.snackBar.open((result as any).error, 'Dismiss', {duration: 3500});
      }
    });
  }

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

  applicationsCount(job: JobPost): number {
    return job.stats?.applicationsCount ?? 0;
  }

  invitedCount(job: JobPost): number {
    return job.stats?.invitedCount ?? 0;
  }

  potentialCount(job: JobPost): number {
    return job.stats?.potentialCount ?? 0;
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
