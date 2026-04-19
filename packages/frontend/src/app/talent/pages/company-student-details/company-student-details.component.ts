import {ChangeDetectionStrategy, Component} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {catchError, combineLatest, map, of, shareReplay, startWith, Subject, switchMap, take} from 'rxjs';

import {Student, StudentAiEvaluationDetails} from '../../models';
import {StudentDirectoryService} from '../../services/student-directory.service';
import {environment} from '../../../../environments/environment';

@Component({
  selector: 'app-company-student-details',
  templateUrl: './company-student-details.component.html',
  styleUrls: ['./company-student-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyStudentDetailsComponent {
  private readonly reloadStudent$ = new Subject<void>();
  private readonly reloadEvaluation$ = new Subject<void>();

  readonly studentId$ = this.route.paramMap.pipe(
    map((params) => Number(params.get('studentId'))),
    map((id) => (Number.isInteger(id) && id > 0 ? id : 0)),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  readonly student$ = combineLatest([this.studentId$, this.reloadStudent$.pipe(startWith(undefined))]).pipe(
    switchMap(([studentId]) => {
      if (studentId <= 0) return of(null);
      return this.directory.getStudentById(studentId).pipe(
        catchError((err: unknown) => {
          this.snackBar.open(this.toErrorMessage(err, 'Could not load student account.'), 'Dismiss', {duration: 3500});
          return of(null);
        }),
      );
    }),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  readonly evaluation$ = combineLatest([this.studentId$, this.reloadEvaluation$.pipe(startWith(undefined))]).pipe(
    switchMap(([studentId]) => {
      if (studentId <= 0) return of(null);
      return this.directory.getStudentEvaluation(studentId).pipe(
        catchError((err: unknown) => {
          this.snackBar.open(this.toErrorMessage(err, 'Could not load AI summary.'), 'Dismiss', {duration: 3500});
          return of(null);
        }),
      );
    }),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  isRunningEvaluation = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly directory: StudentDirectoryService,
    private readonly snackBar: MatSnackBar,
  ) {}

  trackSkill = (_: number, item: Student['skills'][number]) => item.skillName;

  initialsFor(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts.at(0)?.[0] ?? '';
    const last = parts.length > 1 ? parts.at(-1)?.[0] ?? '' : '';
    return (first + last).toUpperCase();
  }

  seekingLabel(student: Student): string {
    const seeksJob = !!student.seekingJob;
    const seeksInternship = !!student.seekingInternship;
    if (seeksJob && seeksInternship) return 'Work + Internship';
    if (seeksJob) return 'Work';
    if (seeksInternship) return 'Internship';
    return 'None selected';
  }

  profileImageHref(profileImageUrl: string | undefined): string {
    if (!profileImageUrl) return '';
    return this.staticAssetHref(profileImageUrl);
  }

  cvHref(cvUrl: string | undefined): string {
    if (!cvUrl) return '';
    return this.staticAssetHref(cvUrl);
  }

  runEvaluation(evaluation: StudentAiEvaluationDetails | null, hasGithubUrl: boolean): void {
    if (!hasGithubUrl) {
      this.snackBar.open('Student does not have a GitHub URL on profile.', 'Dismiss', {duration: 3500});
      return;
    }
    if (this.isRunningEvaluation || evaluation?.status === 'pending') return;

    const force = evaluation?.status === 'ready';
    this.isRunningEvaluation = true;

    this.studentId$.pipe(take(1)).subscribe((studentId) => {
      if (studentId <= 0) {
        this.isRunningEvaluation = false;
        return;
      }

      this.directory.runStudentEvaluation(studentId, force).subscribe({
        next: (result) => {
          const msg = result.fromCache ? 'Used cached AI summary.' : 'AI summary generated.';
          this.snackBar.open(msg, 'Dismiss', {duration: 2600});
          this.isRunningEvaluation = false;
          this.reloadStudent$.next();
          this.reloadEvaluation$.next();
        },
        error: (err: unknown) => {
          this.snackBar.open(this.toErrorMessage(err, 'Could not run AI summary.'), 'Dismiss', {duration: 3500});
          this.isRunningEvaluation = false;
        },
      });
    });
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

  evaluationActionLabel(evaluation: StudentAiEvaluationDetails | null): string {
    if (this.isRunningEvaluation || evaluation?.status === 'pending') return 'Running...';
    if (evaluation?.status === 'ready') return 'Re-run AI Summary';
    return 'Generate AI Summary';
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

  private staticAssetHref(pathOrUrl: string): string {
    if (!pathOrUrl) return '';
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const api = environment.apiUrl;
    const base = api.endsWith('/api') ? api.slice(0, -4) : api;
    return `${base}${pathOrUrl}`;
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
