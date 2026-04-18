import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';

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
  constructor(@Inject(MAT_DIALOG_DATA) readonly data: StudentAiEvaluationDialogData) {}

  get statusLabel(): string {
    switch (this.data.evaluation.status) {
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

  formatDate(iso: string | null): string {
    if (!iso) return 'N/A';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString();
  }

  formatPercent(v: number | null | undefined): string {
    if (v === null || v === undefined) return 'N/A';
    return `${Math.round(v * 100)}%`;
  }
}
