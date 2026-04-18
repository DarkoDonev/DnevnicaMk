import {Component, Inject} from '@angular/core';
import {NonNullableFormBuilder} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

export interface RejectApplicationDialogData {
  applicantName: string;
  jobTitle: string;
}

@Component({
  selector: 'app-reject-application-dialog',
  templateUrl: './reject-application-dialog.component.html',
  styleUrls: ['./reject-application-dialog.component.scss'],
})
export class RejectApplicationDialogComponent {
  readonly form = this.fb.group({
    reason: this.fb.control(''),
  });

  constructor(
    private readonly fb: NonNullableFormBuilder,
    private readonly dialogRef: MatDialogRef<RejectApplicationDialogComponent, string | null>,
    @Inject(MAT_DIALOG_DATA) readonly data: RejectApplicationDialogData,
  ) {}

  confirmReject(): void {
    const reason = this.form.controls.reason.value.trim();
    this.dialogRef.close(reason || null);
  }
}
