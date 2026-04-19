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
    interviewDate: this.fb.control<unknown>(null, {validators: [Validators.required]}),
    interviewTime: this.fb.control('', {validators: [Validators.required]}),
    info: this.fb.control(''),
  });

  constructor(
    private readonly fb: NonNullableFormBuilder,
    private readonly dialogRef: MatDialogRef<HrInterviewScheduleDialogComponent, HrInterviewScheduleDialogResult | undefined>,
    @Inject(MAT_DIALOG_DATA) readonly data: HrInterviewScheduleDialogData,
  ) {
    this.form.patchValue({
      location: data.currentInterview?.location ?? '',
      interviewDate: this.toDateControlValue(data.currentInterview?.atIso),
      interviewTime: this.toTimeValue(data.currentInterview?.atIso),
      info: data.currentInterview?.info ?? '',
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const date = this.coerceDate(raw.interviewDate);
    const time = this.parseTime(raw.interviewTime);
    if (!date || !time) return;

    const at = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.hours,
      time.minutes,
      0,
      0,
    );
    if (Number.isNaN(at.getTime())) return;

    const result: HrInterviewScheduleDialogResult = {
      hrInterviewAtIso: at.toISOString(),
      hrInterviewLocation: raw.location.trim(),
      hrInterviewInfo: raw.info.trim() || undefined,
    };

    this.dialogRef.close(result);
  }

  private toDateControlValue(iso?: string): Date | null {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  private toTimeValue(iso?: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
  }

  private coerceDate(value: unknown): Date | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

    if (value && typeof value === 'object' && 'toDate' in value) {
      const maybeToDate = (value as {toDate?: unknown}).toDate;
      if (typeof maybeToDate === 'function') {
        const converted = (maybeToDate as (this: unknown) => unknown).call(value);
        if (converted instanceof Date && !Number.isNaN(converted.getTime())) return converted;
      }
    }

    if (typeof value === 'string' && value.trim()) {
      const converted = new Date(value);
      if (!Number.isNaN(converted.getTime())) return converted;
    }

    return null;
  }

  private parseTime(raw: string): {hours: number; minutes: number} | null {
    const value = raw.trim();
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
    if (!match) return null;

    return {
      hours: Number(match[1]),
      minutes: Number(match[2]),
    };
  }
}
