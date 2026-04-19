import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';

import {LocalizationService} from '../../../i18n/localization.service';
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

  constructor(private readonly i18n: LocalizationService) {}

  trackReq = (_: number, r: JobPost['requirements'][number]) => r.skillName;

  get postedAtLabel(): string {
    const d = new Date(this.job.postedAtIso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(this.i18n.currentDateLocale, {year: 'numeric', month: 'short', day: '2-digit'});
  }

  get listingTypeLabel(): string {
    const hasJob = !!this.job.isJob;
    const hasInternship = !!this.job.isInternship;
    if (hasJob && hasInternship) return this.i18n.t('Work + Internship');
    if (hasJob) return this.i18n.t('Work');
    if (hasInternship) return this.i18n.t('Internship');
    return this.i18n.t('Unspecified');
  }

  workModeLabel(mode: JobPost['workMode']): string {
    if (mode === 'Remote') return this.i18n.t('Remote');
    if (mode === 'Hybrid') return this.i18n.t('Hybrid');
    if (mode === 'On-site') return this.i18n.t('On-site');
    return mode;
  }

  get applyStatusClass(): string {
    const raw = (this.applyStatusLabel ?? '').toLowerCase();
    if (!raw) return 'st-default';
    if (raw.includes('approved') || raw.includes('done') || raw.includes('одоб') || raw.includes('заврш')) {
      return 'st-approved';
    }
    if (raw.includes('hr interview') || raw.includes('technical interview') || raw.includes('interview') || raw.includes('интервју')) {
      return 'st-interview';
    }
    if (raw.includes('invited') || raw.includes('покан')) return 'st-invited';
    if (raw.includes('declined')) return 'st-declined';
    if (raw.includes('rejected') || raw.includes('одбиен')) return 'st-rejected';
    if (raw.includes('applied') || raw.includes('аплиц')) return 'st-applied';
    return 'st-default';
  }

  onApply(): void {
    this.applyClick.emit(this.job.id);
  }

  onViewDetails(): void {
    this.detailsClick.emit(this.job.id);
  }
}
