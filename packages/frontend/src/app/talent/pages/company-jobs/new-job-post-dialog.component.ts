import {ChangeDetectionStrategy, Component} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {NonNullableFormBuilder, Validators} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';
import {catchError, debounceTime, map, Observable, of, shareReplay, startWith, switchMap} from 'rxjs';

import {LocalizationService} from '../../../i18n/localization.service';
import {JobRequirement, WorkMode} from '../../models';
import {JobBoardService, PotentialPreviewPayload} from '../../services/job-board.service';
import {TechSkillsService} from '../../services/tech-skills.service';

interface PotentialPreviewState {
  loading: boolean;
  count: number | null;
  errorMessage?: string;
}

@Component({
  selector: 'app-new-job-post-dialog',
  templateUrl: './new-job-post-dialog.component.html',
  styleUrls: ['./new-job-post-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewJobPostDialogComponent {
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
    isJob: this.fb.control(true),
    isInternship: this.fb.control(false),
    description: this.fb.control('', {validators: [Validators.required, Validators.minLength(20)]}),
    requirements: this.requirements,
  });

  readonly potentialPreview$: Observable<PotentialPreviewState> = this.form.valueChanges.pipe(
    startWith(this.form.getRawValue()),
    debounceTime(250),
    map(() => this.buildPreviewPayload()),
    switchMap((payload) => {
      if (!payload) {
        return of({loading: false, count: null} as PotentialPreviewState);
      }

      return this.jobs.previewPotentialStudents(payload).pipe(
        map((count) => ({loading: false, count} as PotentialPreviewState)),
        startWith({loading: true, count: null} as PotentialPreviewState),
        catchError((err: unknown) =>
          of({
            loading: false,
            count: null,
            errorMessage: this.toErrorMessage(err, this.i18n.t('Could not calculate potential matches.')),
          } as PotentialPreviewState),
        ),
      );
    }),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  constructor(
    private readonly fb: NonNullableFormBuilder,
    private readonly jobs: JobBoardService,
    private readonly skillService: TechSkillsService,
    private readonly dialogRef: MatDialogRef<NewJobPostDialogComponent>,
    private readonly i18n: LocalizationService,
  ) {}

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

  workModeLabel(mode: WorkMode): string {
    if (mode === 'Remote') return this.i18n.t('Remote');
    if (mode === 'Hybrid') return this.i18n.t('Hybrid');
    if (mode === 'On-site') return this.i18n.t('On-site');
    return mode;
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
        requirements: this.normalizeRequirements(payload.requirements),
      })
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (err: unknown) => {
          this.dialogRef.close({error: this.toErrorMessage(err, this.i18n.t('Could not post job.'))});
        },
      });
  }

  cancel(): void {
    if (this.isSubmitting) return;
    this.dialogRef.close(false);
  }

  private buildPreviewPayload(): PotentialPreviewPayload | null {
    const payload = this.form.getRawValue();
    const requirements = this.normalizeRequirements(payload.requirements);
    if (requirements.length === 0) return null;

    return {
      isJob: payload.isJob,
      isInternship: payload.isInternship,
      requirements,
    };
  }

  private normalizeRequirements(input: readonly JobRequirement[]): JobRequirement[] {
    const dedup = new Map<string, number>();

    for (const requirement of input) {
      const skillName = (requirement.skillName ?? '').trim();
      if (!skillName) continue;

      const minYears = Math.max(0, Number(requirement.minYears ?? 0));
      const prev = dedup.get(skillName);
      dedup.set(skillName, prev === undefined ? minYears : Math.max(prev, minYears));
    }

    return Array.from(dedup.entries()).map(([skillName, minYears]) => ({skillName, minYears}));
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
