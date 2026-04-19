import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';

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
    if (seeksJob && seeksInternship) return 'Work + Internship';
    if (seeksJob) return 'Work';
    if (seeksInternship) return 'Internship';
    return 'None selected';
  }

  get evaluationStatus(): EvaluationStatus {
    return this.student.aiEvaluationPreview?.status ?? 'none';
  }

  get evaluationStatusLabel(): string {
    switch (this.evaluationStatus) {
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
