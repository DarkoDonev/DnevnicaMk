import {ChangeDetectionStrategy, Component, OnDestroy} from '@angular/core';
import {FormArray, FormControl, FormGroup, NonNullableFormBuilder} from '@angular/forms';
import {combineLatest, map, shareReplay, startWith, Subject, takeUntil} from 'rxjs';

import {Student} from '../../models';
import {StudentDirectoryService} from '../../services/student-directory.service';
import {TechSkillsService} from '../../services/tech-skills.service';

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
  private readonly destroy$ = new Subject<void>();

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

  readonly students$ = this.directory.getStudents().pipe(shareReplay({bufferSize: 1, refCount: true}));

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
  ) {
    this.filters.controls.skills.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((skills) => {
      this.syncRequirementsWithSkills((skills ?? []).filter(Boolean));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackStudent = (_: number, s: Student) => s.id;

  clearFilters(): void {
    this.filters.controls.query.setValue('');
    this.filters.controls.skills.setValue([]);
    this.requirements.clear();
  }

  removeSkillFilter(skill: string): void {
    const current = this.filters.controls.skills.value ?? [];
    this.filters.controls.skills.setValue(current.filter((s) => s !== skill));
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
}
