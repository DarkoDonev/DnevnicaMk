import {ChangeDetectionStrategy, Component} from '@angular/core';
import {catchError, of, shareReplay} from 'rxjs';

import {CompanyApprovalService} from '../../services/company-approval.service';

@Component({
  selector: 'app-company-registration-pending',
  templateUrl: './company-registration-pending.component.html',
  styleUrls: ['./company-registration-pending.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyRegistrationPendingComponent {
  readonly contact$ = this.companyApproval
    .getContactInfo()
    .pipe(
      catchError(() => of({email: 'admin@dnevnicamk.local', phone: '+389 70 000 000'})),
      shareReplay({bufferSize: 1, refCount: true}),
    );

  constructor(private readonly companyApproval: CompanyApprovalService) {}
}
