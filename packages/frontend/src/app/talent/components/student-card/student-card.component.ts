import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';

import {LocalizationService} from '../../../i18n/localization.service';
import {EvaluationStatus, Student} from '../../models';
import {environment} from '../../../../environments/environment';

@Component({
  selector: 'app-student-card',
  templateUrl: './student-card.component.html',
  styleUrls: ['./student-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentCardComponent {
  @Input({required: true}) student!: Student;
  @Input() analyzeLoading = false;
  @Input() showEvaluationActions = false;

  @Output() analyzeRequested = new EventEmitter<Student>();
  @Output() detailsRequested = new EventEmitter<Student>();

  constructor(private readonly i18n: LocalizationService) {}

  get initials(): string {
    const parts = this.student.name.trim().split(/\s+/).filter(Boolean);
    const first = parts.at(0)?.[0] ?? '';
    const last = parts.length > 1 ? parts.at(-1)?.[0] ?? '' : '';
    return (first + last).toUpperCase();
  }

  trackSkill = (_: number, item: Student['skills'][number]) => item.skillName;

  get seekingLabel(): string {
    const seeksJob = !!this.student.seekingJob;
    const seeksInternship = !!this.student.seekingInternship;
    if (seeksJob && seeksInternship) return this.i18n.t('Work + Internship');
    if (seeksJob) return this.i18n.t('Work');
    if (seeksInternship) return this.i18n.t('Internship');
    return this.i18n.t('None selected');
  }

  get evaluationStatus(): EvaluationStatus {
    return this.student.aiEvaluationPreview?.status ?? 'none';
  }

  get evaluationStatusLabel(): string {
    switch (this.evaluationStatus) {
      case 'ready':
        return this.i18n.t('Ready');
      case 'pending':
        return this.i18n.t('Running');
      case 'failed':
        return this.i18n.t('Failed');
      case 'none':
      default:
        return this.i18n.t('Not analyzed');
    }
  }

  get canViewDetails(): boolean {
    return this.evaluationStatus === 'ready' || this.evaluationStatus === 'failed';
  }

  requestAnalyze(): void {
    if (this.analyzeLoading) return;
    this.analyzeRequested.emit(this.student);
  }

  requestDetails(): void {
    if (!this.canViewDetails) return;
    this.detailsRequested.emit(this.student);
  }

  profileImageHref(profileImageUrl: string | undefined): string {
    if (!profileImageUrl) return '';
    if (/^https?:\/\//i.test(profileImageUrl)) return profileImageUrl;
    const api = environment.apiUrl;
    const base = api.endsWith('/api') ? api.slice(0, -4) : api;
    return `${base}${profileImageUrl}`;
  }
}
