import {ChangeDetectionStrategy, Component, OnDestroy} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {FormArray, FormControl, FormGroup, NonNullableFormBuilder} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {combineLatest, map, shareReplay, startWith, Subject, switchMap, takeUntil} from 'rxjs';

import {LocalizationService} from '../../../i18n/localization.service';
import {Student} from '../../models';
import {StudentDirectoryService} from '../../services/student-directory.service';
import {TechSkillsService} from '../../services/tech-skills.service';
import {StudentAiEvaluationDialogComponent} from './student-ai-evaluation-dialog.component';

interface SkillRequirementFilter {
  skillName: string;
  minYears: number;
}

type RequirementGroup = FormGroup<{
  skillName: FormControl<string>;
  minYears: FormControl<number>;
}>;

interface FiltersValue {
  query: string;
  skills: string[];
  requirements: SkillRequirementFilter[];
}

@Component({
  selector: 'app-company-dashboard',
  templateUrl: './company-dashboard.component.html',
  styleUrls: ['./company-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyDashboardComponent implements OnDestroy {
  private readonly reload$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();
  private readonly analyzingStudentIds = new Set<number>();

  readonly skills$ = this.skillService.getSkills().pipe(
    map((r) => r.data),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  readonly requirements = new FormArray<RequirementGroup>([]);

  readonly filters = this.fb.group({
    query: this.fb.control(''),
    skills: this.fb.control<string[]>([]),
    requirements: this.requirements,
  });

  readonly students$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() => this.directory.getStudents()),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  readonly filteredStudents$ = combineLatest([
    this.students$,
    this.filters.valueChanges.pipe(startWith(this.filters.getRawValue())),
  ]).pipe(
    map(([students, filters]) => this.applyFilters(students, filters as FiltersValue)),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  constructor(
    private readonly fb: NonNullableFormBuilder,
    private readonly directory: StudentDirectoryService,
    private readonly skillService: TechSkillsService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly i18n: LocalizationService,
  ) {
    this.filters.controls.skills.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((skills) => {
      this.syncRequirementsWithSkills((skills ?? []).filter(Boolean));
    });
  }

  ngOnDestroy(): void {
    this.reload$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackStudent = (_: number, s: Student) => s.id;

  isAnalyzing(studentId: number): boolean {
    return this.analyzingStudentIds.has(studentId);
  }

  clearFilters(): void {
    this.filters.controls.query.setValue('');
    this.filters.controls.skills.setValue([]);
    this.requirements.clear();
  }

  removeSkillFilter(skill: string): void {
    const current = this.filters.controls.skills.value ?? [];
    this.filters.controls.skills.setValue(current.filter((s) => s !== skill));
  }

  runEvaluation(student: Student): void {
    if (this.analyzingStudentIds.has(student.id)) return;

    this.analyzingStudentIds.add(student.id);
    this.directory.runStudentEvaluation(student.id).subscribe({
      next: (result) => {
        const msg =
          result.status === 'ready'
            ? result.fromCache
              ? this.i18n.t('Used cached AI evaluation for {name}.', {name: student.name})
              : this.i18n.t('AI evaluation updated for {name}.', {name: student.name})
            : this.i18n.t('AI evaluation failed for {name}.', {name: student.name});
        this.snackBar.open(msg, this.i18n.t('Dismiss'), {duration: 3200});
        this.analyzingStudentIds.delete(student.id);
        this.reload$.next();
      },
      error: (err: unknown) => {
        this.snackBar.open(
          this.toErrorMessage(err, this.i18n.t('Could not run AI evaluation.')),
          this.i18n.t('Dismiss'),
          {duration: 3500},
        );
        this.analyzingStudentIds.delete(student.id);
      },
    });
  }

  viewEvaluationDetails(student: Student): void {
    this.directory.getStudentEvaluation(student.id).subscribe({
      next: (evaluation) => {
        this.dialog.open(StudentAiEvaluationDialogComponent, {
          width: '860px',
          maxWidth: '96vw',
          data: {
            studentName: student.name,
            evaluation,
          },
        });
      },
      error: (err: unknown) => {
        this.snackBar.open(
          this.toErrorMessage(err, this.i18n.t('Could not load AI evaluation details.')),
          this.i18n.t('Dismiss'),
          {duration: 3500},
        );
      },
    });
  }

  private applyFilters(students: readonly Student[], filters: FiltersValue): readonly Student[] {
    const query = (filters.query ?? '').trim().toLowerCase();
    const selectedSkills = (filters.skills ?? []).filter(Boolean);
    const requirements = this.normalizeRequirements(filters.requirements ?? [], selectedSkills);

    const matchesQuery = (s: Student): boolean => {
      if (!query) return true;
      const haystack = [
        s.name,
        s.headline,
        s.contact.email,
        s.contact.location,
        ...s.skills.map((sk) => sk.skillName),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    };

    const matchesRequirements = (s: Student): boolean => {
      if (requirements.length === 0) return true;
      return requirements.every((req) =>
        s.skills.some((sk) => sk.skillName === req.skillName && sk.yearsOfExperience >= req.minYears),
      );
    };

    return students
      .filter((s) => matchesQuery(s) && matchesRequirements(s))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private syncRequirementsWithSkills(skills: readonly string[]): void {
    const existing = new Map<string, number>();
    for (const g of this.requirements.controls) {
      const v = g.getRawValue() as SkillRequirementFilter;
      existing.set(v.skillName, Math.max(0, Number(v.minYears ?? 0)));
    }

    this.requirements.clear();
    for (const s of skills) {
      this.requirements.push(this.buildRequirementGroup(s, existing.get(s) ?? 0));
    }
  }

  private normalizeRequirements(
    requirements: readonly SkillRequirementFilter[],
    selectedSkills: readonly string[],
  ): SkillRequirementFilter[] {
    if (selectedSkills.length === 0) return [];

    const selected = new Set<string>(selectedSkills);
    const dedup = new Map<string, number>();
    for (const r of requirements) {
      if (!selected.has(r.skillName)) continue;
      const years = Math.max(0, Number(r.minYears ?? 0));
      const prev = dedup.get(r.skillName);
      dedup.set(r.skillName, prev === undefined ? years : Math.max(prev, years));
    }

    return selectedSkills.map((s) => ({skillName: s, minYears: dedup.get(s) ?? 0}));
  }

  private buildRequirementGroup(skillName: string, minYears: number): RequirementGroup {
    return this.fb.group({
      skillName: this.fb.control(skillName),
      minYears: this.fb.control(Math.max(0, Number(minYears ?? 0))),
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
