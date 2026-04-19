import {Component, Inject} from '@angular/core';
import {NonNullableFormBuilder, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

import {JobApplication} from '../../models';

export interface HrInterviewScheduleDialogData {
  applicantName: string;
  currentInterview?: JobApplication['hrInterview'];
}

export interface HrInterviewScheduleDialogResult {
  hrInterviewAtIso: string;
  hrInterviewLocation: string;
  hrInterviewInfo?: string;
}

@Component({
  selector: 'app-hr-interview-schedule-dialog',
  templateUrl: './hr-interview-schedule-dialog.component.html',
  styleUrls: ['./hr-interview-schedule-dialog.component.scss'],
})
export class HrInterviewScheduleDialogComponent {
  readonly form = this.fb.group({
    location: this.fb.control('', {validators: [Validators.required]}),
    atLocal: this.fb.control('', {validators: [Validators.required]}),
    info: this.fb.control(''),
  });

  constructor(
    private readonly fb: NonNullableFormBuilder,
    private readonly dialogRef: MatDialogRef<HrInterviewScheduleDialogComponent, HrInterviewScheduleDialogResult | undefined>,
    @Inject(MAT_DIALOG_DATA) readonly data: HrInterviewScheduleDialogData,
  ) {
    this.form.patchValue({
      location: data.currentInterview?.location ?? '',
      atLocal: this.toLocalDateTimeValue(data.currentInterview?.atIso),
      info: data.currentInterview?.info ?? '',
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const at = new Date(raw.atLocal);
    if (Number.isNaN(at.getTime())) return;

    const result: HrInterviewScheduleDialogResult = {
      hrInterviewAtIso: at.toISOString(),
      hrInterviewLocation: raw.location.trim(),
      hrInterviewInfo: raw.info.trim() || undefined,
    };

    this.dialogRef.close(result);
  }

  private toLocalDateTimeValue(iso?: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }
}
