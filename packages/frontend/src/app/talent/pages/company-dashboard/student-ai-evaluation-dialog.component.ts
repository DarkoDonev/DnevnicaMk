import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';

import {LocalizationService} from '../../../i18n/localization.service';
import {StudentAiEvaluationDetails} from '../../models';

export interface StudentAiEvaluationDialogData {
  studentName: string;
  evaluation: StudentAiEvaluationDetails;
}

@Component({
  selector: 'app-student-ai-evaluation-dialog',
  templateUrl: './student-ai-evaluation-dialog.component.html',
  styleUrls: ['./student-ai-evaluation-dialog.component.scss'],
})
export class StudentAiEvaluationDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: StudentAiEvaluationDialogData,
    private readonly i18n: LocalizationService,
  ) {}

  get statusLabel(): string {
    switch (this.data.evaluation.status) {
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

  formatDate(iso: string | null): string {
    if (!iso) return this.i18n.t('N/A');
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return this.i18n.t('N/A');
    return d.toLocaleString(this.i18n.currentDateLocale);
  }

  formatPercent(v: number | null | undefined): string {
    if (v === null || v === undefined) return this.i18n.t('N/A');
    return `${Math.round(v * 100)}%`;
  }
}
