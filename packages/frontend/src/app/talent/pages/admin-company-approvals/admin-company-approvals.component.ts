import {ChangeDetectionStrategy, Component} from '@angular/core';
import {NonNullableFormBuilder} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {combineLatest, shareReplay, startWith, Subject, switchMap} from 'rxjs';

import {
  CompanyApprovalItem,
  CompanyApprovalService,
  CompanyRegistrationStatus,
} from '../../services/company-approval.service';

@Component({
  selector: 'app-admin-company-approvals',
  templateUrl: './admin-company-approvals.component.html',
  styleUrls: ['./admin-company-approvals.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCompanyApprovalsComponent {
  readonly statusControl = this.fb.control<CompanyRegistrationStatus>('pending');
  private readonly reload$ = new Subject<void>();
  private readonly actingCompanyIds = new Set<number>();

  readonly statuses: readonly CompanyRegistrationStatus[] = ['pending', 'approved', 'rejected'];
  readonly approvals$ = combineLatest([
    this.statusControl.valueChanges.pipe(startWith(this.statusControl.value)),
    this.reload$.pipe(startWith(undefined)),
  ]).pipe(
    switchMap(([status]) => this.companyApproval.list(status ?? 'pending')),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  readonly noteByCompanyId: Partial<Record<number, string>> = {};

  constructor(
    private readonly fb: NonNullableFormBuilder,
    private readonly companyApproval: CompanyApprovalService,
    private readonly snackBar: MatSnackBar,
  ) {}

  trackByCompanyId = (_: number, item: CompanyApprovalItem) => item.id;

  isActing(companyId: number): boolean {
    return this.actingCompanyIds.has(companyId);
  }

  onNoteInput(companyId: number, value: string): void {
    this.noteByCompanyId[companyId] = value;
  }

  approve(item: CompanyApprovalItem): void {
    if (item.registrationStatus !== 'pending' || this.isActing(item.id)) return;
    this.actingCompanyIds.add(item.id);
    const note = this.noteByCompanyId[item.id]?.trim() || undefined;

    this.companyApproval.approve(item.id, note).subscribe({
      next: () => {
        this.snackBar.open(`Approved ${item.name}.`, 'Dismiss', {duration: 2600});
        this.actingCompanyIds.delete(item.id);
        this.reload$.next();
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Could not approve company.';
        this.snackBar.open(msg, 'Dismiss', {duration: 3500});
        this.actingCompanyIds.delete(item.id);
      },
    });
  }

  reject(item: CompanyApprovalItem): void {
    if (item.registrationStatus !== 'pending' || this.isActing(item.id)) return;
    this.actingCompanyIds.add(item.id);
    const note = this.noteByCompanyId[item.id]?.trim() || undefined;

    this.companyApproval.reject(item.id, note).subscribe({
      next: () => {
        this.snackBar.open(`Rejected ${item.name}.`, 'Dismiss', {duration: 2600});
        this.actingCompanyIds.delete(item.id);
        this.reload$.next();
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Could not reject company.';
        this.snackBar.open(msg, 'Dismiss', {duration: 3500});
        this.actingCompanyIds.delete(item.id);
      },
    });
  }
}
