import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';

import {JobPost} from '../../models';

@Component({
  selector: 'app-job-card',
  templateUrl: './job-card.component.html',
  styleUrls: ['./job-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobCardComponent {
  @Input({required: true}) job!: JobPost;
  @Input() showApplyAction = false;
  @Input() showDetailsAction = false;
  @Input() applyDisabled = false;
  @Input() applyLoading = false;
  @Input() applyStatusLabel: string | null = null;
  @Output() readonly applyClick = new EventEmitter<number>();
  @Output() readonly detailsClick = new EventEmitter<number>();

  trackReq = (_: number, r: JobPost['requirements'][number]) => r.skillName;

  get postedAtLabel(): string {
    const d = new Date(this.job.postedAtIso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: '2-digit'});
  }

  get listingTypeLabel(): string {
    const hasJob = !!this.job.isJob;
    const hasInternship = !!this.job.isInternship;
    if (hasJob && hasInternship) return 'Work + Internship';
    if (hasJob) return 'Work';
    if (hasInternship) return 'Internship';
    return 'Unspecified';
  }

  onApply(): void {
    this.applyClick.emit(this.job.id);
  }

  onViewDetails(): void {
    this.detailsClick.emit(this.job.id);
  }
}
