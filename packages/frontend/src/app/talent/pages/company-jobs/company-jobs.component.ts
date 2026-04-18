import {ChangeDetectionStrategy, Component} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {NonNullableFormBuilder, Validators} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, combineLatest, map, of, shareReplay, startWith, Subject, switchMap} from 'rxjs';

import {JobBoardService} from '../../services/job-board.service';
import {ApplicationStatus, JobApplication, JobPost, WorkMode} from '../../models';
import {TechSkillsService} from '../../services/tech-skills.service';
import {RejectApplicationDialogComponent} from './reject-application-dialog.component';

interface ApplicationAction {
  label: string;
  status: ApplicationStatus;
  color: 'primary' | 'accent' | 'warn';
  openRejectDialog?: boolean;
}

@Component({
  selector: 'app-company-jobs',
  templateUrl: './company-jobs.component.html',
  styleUrls: ['./company-jobs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyJobsComponent {
  private readonly reload$ = new Subject<void>();

  readonly skills$ = this.skillService.getSkills().pipe(
    map((r) => r.data),
    shareReplay({bufferSize: 1, refCount: true}),
  );
  readonly workModes: readonly WorkMode[] = ['Remote', 'Hybrid', 'On-site'];

  isSubmitting = false;
  updatingApplicationId: number | null = null;

  readonly requirements = this.fb.array([
    this.fb.group({
      skillName: this.fb.control('', {validators: [Validators.required]}),
      minYears: this.fb.control(0, {validators: [Validators.min(0), Validators.max(50)]}),
    }),
  ]);

  readonly form = this.fb.group({
    title: this.fb.control('', {validators: [Validators.required, Validators.minLength(4)]}),
    location: this.fb.control('Remote', {validators: [Validators.required]}),
    workMode: this.fb.control<WorkMode>('Remote', {validators: [Validators.required]}),
    isJob: this.fb.control(true),
    isInternship: this.fb.control(false),
    description: this.fb.control('', {validators: [Validators.required, Validators.minLength(20)]}),
    requirements: this.requirements,
  });

  readonly companyJobs$ = this.reload$.pipe(
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

  readonly companyApplications$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() => this.jobs.getCompanyApplications()),
    catchError((err: unknown) => {
      const msg = this.toErrorMessage(err, 'Could not load applications.');
      this.snackBar.open(msg, 'Dismiss', {duration: 3500});
      return of([] as readonly JobApplication[]);
    }),
    map((applications) => applications.slice().sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso))),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  readonly companyJobsVm$ = combineLatest([this.companyJobs$, this.companyApplications$]).pipe(
    map(([jobs, applications]) => {
      const applicationsByJobId = new Map<number, readonly JobApplication[]>();
      for (const app of applications) {
        const list = applicationsByJobId.get(app.job.id) ?? [];
        applicationsByJobId.set(app.job.id, [...list, app]);
      }
      return {jobs, applicationsByJobId};
    }),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  constructor(
    private readonly fb: NonNullableFormBuilder,
    private readonly jobs: JobBoardService,
    private readonly skillService: TechSkillsService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
  ) {}

  trackJob = (_: number, j: JobPost) => j.id;
  trackApplication = (_: number, app: JobApplication) => app.id;

  addRequirement(): void {
    this.requirements.push(
      this.fb.group({
        skillName: this.fb.control('', {validators: [Validators.required]}),
        minYears: this.fb.control(0, {validators: [Validators.min(0), Validators.max(50)]}),
      }),
    );
  }

  removeRequirement(idx: number): void {
    if (this.requirements.length <= 1) return;
    this.requirements.removeAt(idx);
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    const payload = this.form.getRawValue();
    this.jobs
      .createJob({
        title: payload.title,
        location: payload.location,
        workMode: payload.workMode,
        isJob: payload.isJob,
        isInternship: payload.isInternship,
        description: payload.description,
        requirements: payload.requirements,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Job posted.', 'Dismiss', {duration: 2500});
          // Reset to a clean state but keep a single requirement row.
          this.requirements.clear();
          this.addRequirement();
          this.form.controls.title.setValue('');
          this.form.controls.location.setValue('Remote');
          this.form.controls.workMode.setValue('Remote');
          this.form.controls.isJob.setValue(true);
          this.form.controls.isInternship.setValue(false);
          this.form.controls.description.setValue('');
          this.form.markAsPristine();
          this.form.markAsUntouched();
          this.isSubmitting = false;
          this.reload$.next();
        },
        error: (err: unknown) => {
          const msg = this.toErrorMessage(err, 'Could not post job.');
          this.snackBar.open(msg, 'Dismiss', {duration: 3500});
          this.isSubmitting = false;
        },
      });
  }

  getActionsForStatus(status: ApplicationStatus): readonly ApplicationAction[] {
    switch (status) {
      case 'APPLIED':
        return [
          {label: 'Approve', status: 'APPROVED', color: 'primary'},
          {label: 'Reject', status: 'REJECTED', color: 'warn', openRejectDialog: true},
        ];
      case 'APPROVED':
        return [
          {label: 'HR Interview', status: 'HR_INTERVIEW', color: 'accent'},
          {label: 'Technical Interview', status: 'TECHNICAL_INTERVIEW', color: 'accent'},
          {label: 'Reject', status: 'REJECTED', color: 'warn', openRejectDialog: true},
        ];
      case 'HR_INTERVIEW':
        return [
          {label: 'Technical Interview', status: 'TECHNICAL_INTERVIEW', color: 'accent'},
          {label: 'Reject', status: 'REJECTED', color: 'warn', openRejectDialog: true},
        ];
      case 'TECHNICAL_INTERVIEW':
        return [
          {label: 'HR Interview', status: 'HR_INTERVIEW', color: 'accent'},
          {label: 'Reject', status: 'REJECTED', color: 'warn', openRejectDialog: true},
        ];
      case 'REJECTED':
      default:
        return [];
    }
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

  updateStatus(app: JobApplication, action: ApplicationAction): void {
    if (this.updatingApplicationId !== null) return;

    if (action.openRejectDialog) {
      const dialogRef = this.dialog.open(RejectApplicationDialogComponent, {
        width: '520px',
        data: {
          applicantName: app.student?.name ?? 'Applicant',
          jobTitle: app.job.title,
        },
      });

      dialogRef.afterClosed().subscribe((reason: string | null | undefined) => {
        if (reason === undefined) return;
        this.persistStatusChange(app.id, action.status, reason ?? undefined);
      });
      return;
    }

    this.persistStatusChange(app.id, action.status);
  }

  private persistStatusChange(applicationId: number, status: ApplicationStatus, rejectionReason?: string): void {
    this.updatingApplicationId = applicationId;
    this.jobs.updateApplicationStatus(applicationId, {status, rejectionReason}).subscribe({
      next: () => {
        this.snackBar.open('Application status updated.', 'Dismiss', {duration: 2500});
        this.updatingApplicationId = null;
        this.reload$.next();
      },
      error: (err: unknown) => {
        const msg = this.toErrorMessage(err, 'Could not update application status.');
        this.snackBar.open(msg, 'Dismiss', {duration: 3500});
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
