import {formatDate} from '@angular/common';
import {ChangeDetectorRef, OnDestroy, Pipe, PipeTransform} from '@angular/core';
import {Subscription} from 'rxjs';

import {LocalizationService} from './localization.service';

@Pipe({
  name: 'l10nDate',
  pure: false,
})
export class L10nDatePipe implements PipeTransform, OnDestroy {
  private readonly subscription: Subscription;

  constructor(
    private readonly i18n: LocalizationService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.subscription = this.i18n.language$.subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  transform(value: string | number | Date | null | undefined, format: string = 'medium'): string {
    if (value === null || value === undefined || value === '') return '';

    try {
      return formatDate(value, format, this.i18n.currentDateLocale);
    } catch {
      return '';
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
