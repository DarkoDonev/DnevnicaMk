import {ChangeDetectionStrategy, Component} from '@angular/core';
import {shareReplay} from 'rxjs';

import {CompanyProfileService} from '../../services/company-profile.service';

@Component({
  selector: 'app-company-profile',
  templateUrl: './company-profile.component.html',
  styleUrls: ['./company-profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyProfileComponent {
  readonly profile$ = this.companyProfile.getMe().pipe(shareReplay({bufferSize: 1, refCount: true}));

  constructor(private readonly companyProfile: CompanyProfileService) {}

  statusLabel(status: 'pending' | 'approved' | 'rejected'): string {
    if (status === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    return 'Pending';
  }
}
