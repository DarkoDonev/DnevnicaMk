import {ChangeDetectionStrategy, Component} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, combineLatest, map, of, shareReplay, startWith, Subject, switchMap} from 'rxjs';

import {ApplicationStatus, CompanyJobDetails, JobApplication, JobPost, PotentialStudent} from '../../models';
import {JobBoardService} from '../../services/job-board.service';
import {RejectApplicationDialogComponent} from '../company-jobs/reject-application-dialog.component';
import {
  HrInterviewScheduleDialogComponent,
  HrInterviewScheduleDialogResult,
} from './hr-interview-schedule-dialog.component';

interface ApplicationAction {
  label: string;
  status: ApplicationStatus;
  color: 'primary' | 'accent' | 'warn';
  openRejectDialog?: boolean;
  openHrScheduleDialog?: boolean;
}

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
            this.snackBar.open(this.toErrorMessage(err, 'Could not load job details.'), 'Dismiss', {duration: 3500});
            return of(null);
          }),
        ),
        this.jobs.getPotentialStudents(jobId).pipe(
          catchError((err: unknown) => {
            this.snackBar.open(this.toErrorMessage(err, 'Could not load potential matches.'), 'Dismiss', {duration: 3500});
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
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
  ) {}

  trackRequirement = (_: number, requirement: JobPost['requirements'][number]) => requirement.skillName;
  trackApplication = (_: number, application: JobApplication) => application.id;
  trackPotential = (_: number, student: PotentialStudent) => student.id;
  trackSkill = (_: number, skill: PotentialStudent['skills'][number]) => skill.skillName;

  getActionsForStatus(status: ApplicationStatus): readonly ApplicationAction[] {
    switch (status) {
      case 'APPLIED':
        return [
          {label: 'Approve', status: 'APPROVED', color: 'primary'},
          {label: 'Reject', status: 'REJECTED', color: 'warn', openRejectDialog: true},
        ];
      case 'APPROVED':
        return [
          {label: 'HR Interview', status: 'HR_INTERVIEW', color: 'accent', openHrScheduleDialog: true},
          {label: 'Reject', status: 'REJECTED', color: 'warn', openRejectDialog: true},
        ];
      case 'HR_INTERVIEW':
        return [
          {label: 'Reschedule HR', status: 'HR_INTERVIEW', color: 'accent', openHrScheduleDialog: true},
          {label: 'Mark Done', status: 'DONE', color: 'primary'},
          {label: 'Reject', status: 'REJECTED', color: 'warn', openRejectDialog: true},
        ];
      case 'TECHNICAL_INTERVIEW':
        return [
          {label: 'Mark Done', status: 'DONE', color: 'primary'},
          {label: 'Reject', status: 'REJECTED', color: 'warn', openRejectDialog: true},
        ];
      default:
        return [];
    }
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
    if (hasJob && hasInternship) return 'Work + Internship';
    if (hasJob) return 'Work';
    if (hasInternship) return 'Internship';
    return 'Unspecified';
  }

  seekingLabel(student: PotentialStudent): string {
    const seeksJob = !!student.seekingJob;
    const seeksInternship = !!student.seekingInternship;
    if (seeksJob && seeksInternship) return 'Work + Internship';
    if (seeksJob) return 'Work';
    if (seeksInternship) return 'Internship';
    return 'None selected';
  }

  updateStatus(application: JobApplication, action: ApplicationAction): void {
    if (this.updatingApplicationId !== null) return;

    if (action.openHrScheduleDialog) {
      const dialogRef = this.dialog.open(HrInterviewScheduleDialogComponent, {
        width: '560px',
        maxWidth: '96vw',
        data: {
          applicantName: application.student?.name ?? 'Applicant',
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
          applicantName: application.student?.name ?? 'Applicant',
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
        this.snackBar.open('Request sent to student.', 'Dismiss', {duration: 2500});
        this.invitingStudentId = null;
        this.reload$.next();
      },
      error: (err: unknown) => {
        this.snackBar.open(this.toErrorMessage(err, 'Could not send request.'), 'Dismiss', {duration: 3500});
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
        this.snackBar.open('Application status updated.', 'Dismiss', {duration: 2500});
        this.updatingApplicationId = null;
        this.reload$.next();
      },
      error: (err: unknown) => {
        this.snackBar.open(this.toErrorMessage(err, 'Could not update application status.'), 'Dismiss', {duration: 3500});
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
