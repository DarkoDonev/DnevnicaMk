import {ChangeDetectionStrategy, Component} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, map, of, shareReplay, startWith, Subject, switchMap} from 'rxjs';

import {LocalizationService} from '../../../i18n/localization.service';
import {ApplicationStatus, InviteDecision, JobApplication} from '../../models';
import {JobBoardService} from '../../services/job-board.service';

@Component({
  selector: 'app-student-applications',
  templateUrl: './student-applications.component.html',
  styleUrls: ['./student-applications.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentApplicationsComponent {
  private readonly reload$ = new Subject<void>();
  respondingApplicationId: number | null = null;

  readonly applications$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.jobs.getMyApplications().pipe(
        map((applications) => applications.slice().sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso))),
        catchError((err: unknown) => {
          const msg = this.toErrorMessage(err, this.i18n.t('Could not load applications.'));
          this.snackBar.open(msg, this.i18n.t('Dismiss'), {duration: 3500});
          return of([] as readonly JobApplication[]);
        }),
      ),
    ),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  constructor(
    private readonly jobs: JobBoardService,
    private readonly snackBar: MatSnackBar,
    private readonly i18n: LocalizationService,
  ) {}

  trackApplication = (_: number, app: JobApplication) => app.id;

  refresh(): void {
    this.reload$.next();
  }

  respondToInvitation(application: JobApplication, decision: InviteDecision): void {
    if (this.respondingApplicationId !== null || application.status !== 'INVITED') return;
    this.respondingApplicationId = application.id;

    this.jobs.respondToInvitation(application.id, decision).subscribe({
      next: () => {
        const msg = decision === 'ACCEPT' ? this.i18n.t('Invitation accepted.') : this.i18n.t('Invitation declined.');
        this.snackBar.open(msg, this.i18n.t('Dismiss'), {duration: 2500});
        this.respondingApplicationId = null;
        this.reload$.next();
      },
      error: (err: unknown) => {
        const msg = this.toErrorMessage(err, this.i18n.t('Could not update invitation response.'));
        this.snackBar.open(msg, this.i18n.t('Dismiss'), {duration: 3500});
        this.respondingApplicationId = null;
      },
    });
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

  statusClass(status: ApplicationStatus): string {
    switch (status) {
      case 'INVITED':
        return 'status-invited';
      case 'APPLIED':
        return 'status-applied';
      case 'APPROVED':
        return 'status-approved';
      case 'HR_INTERVIEW':
        return 'status-hr';
      case 'TECHNICAL_INTERVIEW':
        return 'status-tech';
      case 'DONE':
        return 'status-done';
      case 'DECLINED':
        return 'status-declined';
      case 'REJECTED':
        return 'status-rejected';
      default:
        return '';
    }
  }

  jobTypeLabel(job: JobApplication['job']): string {
    const hasJob = !!job.isJob;
    const hasInternship = !!job.isInternship;
    if (hasJob && hasInternship) return this.i18n.t('Work + Internship');
    if (hasJob) return this.i18n.t('Work');
    if (hasInternship) return this.i18n.t('Internship');
    return this.i18n.t('Unspecified');
  }

  workModeLabel(mode: JobApplication['job']['workMode']): string {
    if (mode === 'Remote') return this.i18n.t('Remote');
    if (mode === 'Hybrid') return this.i18n.t('Hybrid');
    if (mode === 'On-site') return this.i18n.t('On-site');
    return mode;
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
