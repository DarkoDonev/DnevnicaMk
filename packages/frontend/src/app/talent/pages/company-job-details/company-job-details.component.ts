import {ChangeDetectionStrategy, Component} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, combineLatest, map, of, shareReplay, startWith, Subject, switchMap} from 'rxjs';

import {LocalizationService} from '../../../i18n/localization.service';
import {ApplicationStatus, CompanyJobDetails, JobApplication, JobPost, PotentialStudent} from '../../models';
import {JobBoardService} from '../../services/job-board.service';
import {StudentDirectoryService} from '../../services/student-directory.service';
import {RejectApplicationDialogComponent} from '../company-jobs/reject-application-dialog.component';
import {
  HrInterviewScheduleDialogComponent,
  HrInterviewScheduleDialogResult,
} from './hr-interview-schedule-dialog.component';

interface ApplicationAction {
  labelKey: AppI18nActionKey;
  status: ApplicationStatus;
  color: 'primary' | 'accent' | 'warn';
  openRejectDialog?: boolean;
  openHrScheduleDialog?: boolean;
}

type AppI18nActionKey = 'Approve' | 'Reject' | 'HR Interview' | 'Reschedule HR' | 'Mark Done';

interface CompanyJobDetailsVm {
  jobId: number;
  details: CompanyJobDetails;
  potentialStudents: readonly PotentialStudent[];
}

@Component({
  selector: 'app-company-job-details',
  templateUrl: './company-job-details.component.html',
  styleUrls: ['./company-job-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyJobDetailsComponent {
  private readonly reload$ = new Subject<void>();
  private readonly analyzingStudentIds = new Set<number>();

  readonly jobId$ = this.route.paramMap.pipe(
    map((params) => Number(params.get('jobId'))),
    map((id) => (Number.isInteger(id) && id > 0 ? id : 0)),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  readonly vm$ = combineLatest([this.jobId$, this.reload$.pipe(startWith(undefined))]).pipe(
    switchMap(([jobId]) => {
      if (jobId <= 0) return of(null);

      return combineLatest([
        this.jobs.getCompanyJobDetails(jobId).pipe(
          catchError((err: unknown) => {
            this.snackBar.open(
              this.toErrorMessage(err, this.i18n.t('Could not load job details.')),
              this.i18n.t('Dismiss'),
              {duration: 3500},
            );
            return of(null);
          }),
        ),
        this.jobs.getPotentialStudents(jobId).pipe(
          catchError((err: unknown) => {
            this.snackBar.open(
              this.toErrorMessage(err, this.i18n.t('Could not load potential matches.')),
              this.i18n.t('Dismiss'),
              {duration: 3500},
            );
            return of([] as readonly PotentialStudent[]);
          }),
        ),
      ]).pipe(
        map(([details, potentialStudents]) => {
          if (!details) return null;
          return {jobId, details, potentialStudents} as CompanyJobDetailsVm;
        }),
      );
    }),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  updatingApplicationId: number | null = null;
  invitingStudentId: number | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly jobs: JobBoardService,
    private readonly directory: StudentDirectoryService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly i18n: LocalizationService,
  ) {}

  trackRequirement = (_: number, requirement: JobPost['requirements'][number]) => requirement.skillName;
  trackApplication = (_: number, application: JobApplication) => application.id;
  trackPotential = (_: number, student: PotentialStudent) => student.id;
  trackSkill = (_: number, skill: PotentialStudent['skills'][number]) => skill.skillName;

  isAnalyzingStudent(studentId: number | null | undefined): boolean {
    if (!studentId) return false;
    return this.analyzingStudentIds.has(studentId);
  }

  applicantEvaluationActionLabel(application: JobApplication): string {
    if (this.isAnalyzingStudent(application.student?.id)) return this.i18n.t('Running...');
    if (application.student?.aiEvaluationPreview?.status === 'pending') return this.i18n.t('Running...');
    if (application.student?.aiEvaluationPreview?.status === 'ready') return this.i18n.t('Re-run AI Summary');
    return this.i18n.t('Generate AI Summary');
  }

  canRunApplicantEvaluation(application: JobApplication): boolean {
    const studentId = application.student?.id;
    if (!studentId) return false;
    if (this.analyzingStudentIds.has(studentId)) return false;
    if (application.student?.aiEvaluationPreview?.status === 'pending') return false;
    return true;
  }

  runApplicantEvaluation(application: JobApplication): void {
    const studentId = application.student?.id;
    if (!studentId || !this.canRunApplicantEvaluation(application)) return;
    const force = application.student?.aiEvaluationPreview?.status === 'ready';

    this.analyzingStudentIds.add(studentId);
    this.directory.runStudentEvaluation(studentId, force).subscribe({
      next: (result) => {
        const name = application.student?.name ?? 'Applicant';
        const msg =
          result.status === 'ready'
            ? result.fromCache
              ? this.i18n.t('Used cached AI summary for {name}.', {name})
              : this.i18n.t('AI summary generated for {name}.', {name})
            : this.i18n.t('AI summary failed for {name}.', {name});
        this.snackBar.open(msg, this.i18n.t('Dismiss'), {duration: 3200});
        this.analyzingStudentIds.delete(studentId);
        this.reload$.next();
      },
      error: (err: unknown) => {
        this.snackBar.open(
          this.toErrorMessage(err, this.i18n.t('Could not run AI summary.')),
          this.i18n.t('Dismiss'),
          {duration: 3500},
        );
        this.analyzingStudentIds.delete(studentId);
      },
    });
  }

  getActionsForStatus(status: ApplicationStatus): readonly ApplicationAction[] {
    switch (status) {
      case 'APPLIED':
        return [
          {labelKey: 'Approve', status: 'APPROVED', color: 'primary'},
          {labelKey: 'Reject', status: 'REJECTED', color: 'warn', openRejectDialog: true},
        ];
      case 'APPROVED':
        return [
          {labelKey: 'HR Interview', status: 'HR_INTERVIEW', color: 'accent', openHrScheduleDialog: true},
          {labelKey: 'Reject', status: 'REJECTED', color: 'warn', openRejectDialog: true},
        ];
      case 'HR_INTERVIEW':
        return [
          {labelKey: 'Reschedule HR', status: 'HR_INTERVIEW', color: 'accent', openHrScheduleDialog: true},
          {labelKey: 'Mark Done', status: 'DONE', color: 'primary'},
          {labelKey: 'Reject', status: 'REJECTED', color: 'warn', openRejectDialog: true},
        ];
      case 'TECHNICAL_INTERVIEW':
        return [
          {labelKey: 'Mark Done', status: 'DONE', color: 'primary'},
          {labelKey: 'Reject', status: 'REJECTED', color: 'warn', openRejectDialog: true},
        ];
      default:
        return [];
    }
  }

  actionLabel(action: ApplicationAction): string {
    return this.i18n.t(action.labelKey);
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

  listingTypeLabel(job: JobPost): string {
    const hasJob = !!job.isJob;
    const hasInternship = !!job.isInternship;
    if (hasJob && hasInternship) return this.i18n.t('Work + Internship');
    if (hasJob) return this.i18n.t('Work');
    if (hasInternship) return this.i18n.t('Internship');
    return this.i18n.t('Unspecified');
  }

  seekingLabel(student: PotentialStudent): string {
    const seeksJob = !!student.seekingJob;
    const seeksInternship = !!student.seekingInternship;
    if (seeksJob && seeksInternship) return this.i18n.t('Work + Internship');
    if (seeksJob) return this.i18n.t('Work');
    if (seeksInternship) return this.i18n.t('Internship');
    return this.i18n.t('None selected');
  }

  workModeLabel(mode: JobPost['workMode']): string {
    if (mode === 'Remote') return this.i18n.t('Remote');
    if (mode === 'Hybrid') return this.i18n.t('Hybrid');
    if (mode === 'On-site') return this.i18n.t('On-site');
    return mode;
  }

  updateStatus(application: JobApplication, action: ApplicationAction): void {
    if (this.updatingApplicationId !== null) return;

    if (action.openHrScheduleDialog) {
      const dialogRef = this.dialog.open(HrInterviewScheduleDialogComponent, {
        width: '560px',
        maxWidth: '96vw',
        data: {
          applicantName: application.student?.name ?? this.i18n.t('Applicant'),
          currentInterview: application.hrInterview,
        },
      });

      dialogRef.afterClosed().subscribe((schedule: HrInterviewScheduleDialogResult | undefined) => {
        if (!schedule) return;
        this.persistStatusChange(application.id, action.status, undefined, schedule);
      });
      return;
    }

    if (action.openRejectDialog) {
      const dialogRef = this.dialog.open(RejectApplicationDialogComponent, {
        width: '520px',
        data: {
          applicantName: application.student?.name ?? this.i18n.t('Applicant'),
          jobTitle: application.job.title,
        },
      });

      dialogRef.afterClosed().subscribe((reason: string | null | undefined) => {
        if (reason === undefined) return;
        this.persistStatusChange(application.id, action.status, reason ?? undefined);
      });
      return;
    }

    this.persistStatusChange(application.id, action.status);
  }

  sendRequest(jobId: number, studentId: number): void {
    if (this.invitingStudentId !== null) return;
    this.invitingStudentId = studentId;

    this.jobs.inviteStudent(jobId, studentId).subscribe({
      next: () => {
        this.snackBar.open(this.i18n.t('Request sent to student.'), this.i18n.t('Dismiss'), {duration: 2500});
        this.invitingStudentId = null;
        this.reload$.next();
      },
      error: (err: unknown) => {
        this.snackBar.open(
          this.toErrorMessage(err, this.i18n.t('Could not send request.')),
          this.i18n.t('Dismiss'),
          {duration: 3500},
        );
        this.invitingStudentId = null;
      },
    });
  }

  private persistStatusChange(
    applicationId: number,
    status: ApplicationStatus,
    rejectionReason?: string,
    schedule?: HrInterviewScheduleDialogResult,
  ): void {
    this.updatingApplicationId = applicationId;
    this.jobs
      .updateApplicationStatus(applicationId, {
        status,
        rejectionReason,
        hrInterviewAtIso: schedule?.hrInterviewAtIso,
        hrInterviewLocation: schedule?.hrInterviewLocation,
        hrInterviewInfo: schedule?.hrInterviewInfo,
      })
      .subscribe({
      next: () => {
        this.snackBar.open(this.i18n.t('Application status updated.'), this.i18n.t('Dismiss'), {duration: 2500});
        this.updatingApplicationId = null;
        this.reload$.next();
      },
      error: (err: unknown) => {
        this.snackBar.open(
          this.toErrorMessage(err, this.i18n.t('Could not update application status.')),
          this.i18n.t('Dismiss'),
          {duration: 3500},
        );
        this.updatingApplicationId = null;
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
