import {ChangeDetectionStrategy, Component} from '@angular/core';
import {NonNullableFormBuilder, Validators} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {map, shareReplay, startWith, Subject, switchMap} from 'rxjs';

import {JobBoardService} from '../../services/job-board.service';
import {JobPost, WorkMode} from '../../models';
import {TechSkillsService} from '../../services/tech-skills.service';

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
    description: this.fb.control('', {validators: [Validators.required, Validators.minLength(20)]}),
    requirements: this.requirements,
  });

  readonly companyJobs$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() => this.jobs.getCompanyJobs()),
    map((jobs) => jobs.slice().sort((a, b) => b.postedAtIso.localeCompare(a.postedAtIso))),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  constructor(
    private readonly fb: NonNullableFormBuilder,
    private readonly jobs: JobBoardService,
    private readonly skillService: TechSkillsService,
    private readonly snackBar: MatSnackBar,
  ) {}

  trackJob = (_: number, j: JobPost) => j.id;

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
          this.form.controls.description.setValue('');
          this.form.markAsPristine();
          this.form.markAsUntouched();
          this.isSubmitting = false;
          this.reload$.next();
        },
        error: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Could not post job.';
          this.snackBar.open(msg, 'Dismiss', {duration: 3500});
          this.isSubmitting = false;
        },
      });
  }
}
