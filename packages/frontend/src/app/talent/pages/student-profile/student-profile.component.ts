import {ChangeDetectionStrategy, Component, OnDestroy} from '@angular/core';
import {NonNullableFormBuilder, Validators} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {catchError, map, of, shareReplay, startWith, Subject, switchMap, takeUntil} from 'rxjs';

import {StudentDirectoryService} from '../../services/student-directory.service';
import {AuthService} from '../../services/auth.service';
import {Student, StudentAiEvaluationDetails} from '../../models';
import {TechSkillsService} from '../../services/tech-skills.service';
import {environment} from '../../../../environments/environment';

@Component({
  selector: 'app-student-profile',
  templateUrl: './student-profile.component.html',
  styleUrls: ['./student-profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentProfileComponent implements OnDestroy {
  private readonly reload$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  readonly skills$ = this.skillService.getSkills().pipe(
    map((r) => r.data),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  readonly student$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() => this.directory.getMe()),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  readonly evaluation$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() => this.directory.getMyEvaluation().pipe(catchError(() => of(null)))),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  readonly profileForm = this.fb.group({
    name: this.fb.control('', {validators: [Validators.required, Validators.minLength(2)]}),
    headline: this.fb.control(''),
    phone: this.fb.control(''),
    location: this.fb.control(''),
    linkedInUrl: this.fb.control(''),
    githubUrl: this.fb.control(''),
    bio: this.fb.control(''),
    seekingJob: this.fb.control(false),
    seekingInternship: this.fb.control(false),
  });

  readonly addSkillForm = this.fb.group({
    skillName: this.fb.control('', {validators: [Validators.required]}),
    yearsOfExperience: this.fb.control(0, {validators: [Validators.required, Validators.min(0), Validators.max(50)]}),
  });

  isSaving = false;

  constructor(
    private readonly auth: AuthService,
    private readonly directory: StudentDirectoryService,
    private readonly router: Router,
    private readonly fb: NonNullableFormBuilder,
    private readonly snackBar: MatSnackBar,
    private readonly skillService: TechSkillsService,
  ) {
    this.student$.pipe(takeUntil(this.destroy$)).subscribe((student) => this.patchProfileForm(student));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  addSkill(): void {
    if (this.addSkillForm.invalid || this.isSaving) return;

    const {skillName, yearsOfExperience} = this.addSkillForm.getRawValue();
    this.isSaving = true;

    this.directory.addOrUpdateSkill(skillName, yearsOfExperience).subscribe({
      next: () => {
        this.snackBar.open('Skills updated.', 'Dismiss', {duration: 2500});
        this.isSaving = false;
        this.reload$.next();
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Could not update skills.';
        this.snackBar.open(msg, 'Dismiss', {duration: 3500});
        this.isSaving = false;
      },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.isSaving) return;
    this.isSaving = true;

    const v = this.profileForm.getRawValue();
    this.directory
      .updateMe({
        name: v.name,
        headline: v.headline || undefined,
        phone: v.phone || undefined,
        location: v.location || undefined,
        linkedInUrl: v.linkedInUrl || undefined,
        githubUrl: v.githubUrl || undefined,
        bio: v.bio || undefined,
        seekingJob: v.seekingJob,
        seekingInternship: v.seekingInternship,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Profile updated.', 'Dismiss', {duration: 2500});
          this.isSaving = false;
          this.profileForm.markAsPristine();
          this.profileForm.markAsUntouched();
          this.reload$.next();
        },
        error: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Could not update profile.';
          this.snackBar.open(msg, 'Dismiss', {duration: 3500});
          this.isSaving = false;
        },
      });
  }

  onCvSelected(input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (!file) return;

    this.isSaving = true;
    this.directory.uploadCv(file).subscribe({
      next: () => {
        this.snackBar.open('CV uploaded.', 'Dismiss', {duration: 2500});
        this.isSaving = false;
        input.value = '';
        this.reload$.next();
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Could not upload CV.';
        this.snackBar.open(msg, 'Dismiss', {duration: 3500});
        this.isSaving = false;
      },
    });
  }

  removeSkill(skillName: string): void {
    if (this.isSaving) return;
    this.isSaving = true;

    this.directory.removeSkill(skillName).subscribe({
      next: () => {
        this.snackBar.open('Skill removed.', 'Dismiss', {duration: 2500});
        this.isSaving = false;
        this.reload$.next();
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Could not remove skill.';
        this.snackBar.open(msg, 'Dismiss', {duration: 3500});
        this.isSaving = false;
      },
    });
  }

  initialsFor(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts.at(0)?.[0] ?? '';
    const last = parts.length > 1 ? parts.at(-1)?.[0] ?? '' : '';
    return (first + last).toUpperCase();
  }

  trackSkill = (_: number, item: Student['skills'][number]) => item.skillName;

  private patchProfileForm(student: Student): void {
    // Avoid clobbering user edits while typing.
    if (this.profileForm.dirty) return;
    this.profileForm.patchValue(
      {
        name: student.name ?? '',
        headline: student.headline ?? '',
        phone: student.contact.phone ?? '',
        location: student.contact.location ?? '',
        linkedInUrl: student.contact.linkedInUrl ?? '',
        githubUrl: student.contact.githubUrl ?? '',
        bio: student.bio ?? '',
        seekingJob: student.seekingJob ?? false,
        seekingInternship: student.seekingInternship ?? false,
      },
      {emitEvent: false},
    );
  }

  cvHref(cvUrl: string | undefined): string {
    if (!cvUrl) return '';
    if (/^https?:\/\//i.test(cvUrl)) return cvUrl;
    const api = environment.apiUrl;
    const base = api.endsWith('/api') ? api.slice(0, -4) : api;
    return `${base}${cvUrl}`;
  }

  evaluationStatusLabel(evaluation: StudentAiEvaluationDetails | null): string {
    switch (evaluation?.status) {
      case 'ready':
        return 'Ready';
      case 'pending':
        return 'Running';
      case 'failed':
        return 'Failed';
      case 'none':
      default:
        return 'Not analyzed';
    }
  }

  formatIsoDate(iso: string | null): string {
    if (!iso) return 'N/A';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString();
  }

  asPercent(v: number | null | undefined): string {
    if (v === null || v === undefined) return 'N/A';
    return `${Math.round(v * 100)}%`;
  }
}
