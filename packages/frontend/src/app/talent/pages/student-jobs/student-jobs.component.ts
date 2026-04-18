import {ChangeDetectionStrategy, Component} from '@angular/core';
import {NonNullableFormBuilder} from '@angular/forms';
import {combineLatest, map, shareReplay, startWith} from 'rxjs';

import {JobBoardService} from '../../services/job-board.service';
import {JobPost, WorkMode} from '../../models';
import {TechSkillsService} from '../../services/tech-skills.service';

type WorkModeFilter = 'Any' | WorkMode;

interface FiltersValue {
  query: string;
  skills: string[];
  workMode: WorkModeFilter;
}

@Component({
  selector: 'app-student-jobs',
  templateUrl: './student-jobs.component.html',
  styleUrls: ['./student-jobs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentJobsComponent {
  readonly skills$ = this.skillService.getSkills().pipe(
    map((r) => r.data),
    shareReplay({bufferSize: 1, refCount: true}),
  );
  readonly workModeOptions: readonly WorkModeFilter[] = ['Any', 'Remote', 'Hybrid', 'On-site'];

  readonly filters = this.fb.group({
    query: this.fb.control(''),
    skills: this.fb.control<string[]>([]),
    workMode: this.fb.control<WorkModeFilter>('Any'),
  });

  readonly jobs$ = this.jobs.getJobs().pipe(shareReplay({bufferSize: 1, refCount: true}));

  readonly filteredJobs$ = combineLatest([
    this.jobs$,
    this.filters.valueChanges.pipe(startWith(this.filters.getRawValue())),
  ]).pipe(
    map(([jobs, filters]) => this.applyFilters(jobs, filters as FiltersValue)),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  constructor(
    private readonly fb: NonNullableFormBuilder,
    private readonly jobs: JobBoardService,
    private readonly skillService: TechSkillsService,
  ) {}

  trackJob = (_: number, j: JobPost) => j.id;

  clearFilters(): void {
    this.filters.setValue({query: '', skills: [], workMode: 'Any'});
  }

  private applyFilters(jobs: readonly JobPost[], filters: FiltersValue): readonly JobPost[] {
    const query = (filters.query ?? '').trim().toLowerCase();
    const skills = (filters.skills ?? []).filter(Boolean);
    const workMode = filters.workMode ?? 'Any';

    const matchesQuery = (j: JobPost): boolean => {
      if (!query) return true;
      const haystack = [
        j.title,
        j.companyName,
        j.location,
        j.workMode,
        j.description,
        ...j.requirements.map((r) => r.skillName),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    };

    const matchesSkills = (j: JobPost): boolean => {
      if (skills.length === 0) return true;
      return j.requirements.some((r) => skills.includes(r.skillName));
    };

    const matchesMode = (j: JobPost): boolean => {
      if (workMode === 'Any') return true;
      return j.workMode === workMode;
    };

    return jobs
      .filter((j) => matchesQuery(j) && matchesSkills(j) && matchesMode(j))
      .slice()
      .sort((a, b) => b.postedAtIso.localeCompare(a.postedAtIso));
  }
}
