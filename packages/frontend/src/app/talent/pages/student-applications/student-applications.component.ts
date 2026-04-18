import {ChangeDetectionStrategy, Component} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, map, of, shareReplay, startWith, Subject, switchMap} from 'rxjs';

import {ApplicationStatus, JobApplication} from '../../models';
import {JobBoardService} from '../../services/job-board.service';

@Component({
  selector: 'app-student-applications',
  templateUrl: './student-applications.component.html',
  styleUrls: ['./student-applications.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentApplicationsComponent {
  private readonly reload$ = new Subject<void>();

  readonly applications$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.jobs.getMyApplications().pipe(
        map((applications) => applications.slice().sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso))),
        catchError((err: unknown) => {
          const msg = this.toErrorMessage(err, 'Could not load applications.');
          this.snackBar.open(msg, 'Dismiss', {duration: 3500});
          return of([] as readonly JobApplication[]);
        }),
      ),
    ),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  constructor(
    private readonly jobs: JobBoardService,
    private readonly snackBar: MatSnackBar,
  ) {}

  trackApplication = (_: number, app: JobApplication) => app.id;

  refresh(): void {
    this.reload$.next();
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

  statusClass(status: ApplicationStatus): string {
    switch (status) {
      case 'APPLIED':
        return 'status-applied';
      case 'APPROVED':
        return 'status-approved';
      case 'HR_INTERVIEW':
        return 'status-hr';
      case 'TECHNICAL_INTERVIEW':
        return 'status-tech';
      case 'REJECTED':
        return 'status-rejected';
      default:
        return '';
    }
  }

  jobTypeLabel(job: JobApplication['job']): string {
    const hasJob = !!job.isJob;
    const hasInternship = !!job.isInternship;
    if (hasJob && hasInternship) return 'Work + Internship';
    if (hasJob) return 'Work';
    if (hasInternship) return 'Internship';
    return 'Unspecified';
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
