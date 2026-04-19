import {ChangeDetectorRef, OnDestroy, Pipe, PipeTransform} from '@angular/core';
import {Subscription} from 'rxjs';

import {LocalizationService} from './localization.service';
import {I18nKey, InterpolationParams} from './translations';

@Pipe({
  name: 't',
  pure: false,
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private readonly subscription: Subscription;

  constructor(
    private readonly i18n: LocalizationService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.subscription = this.i18n.language$.subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  transform(key: I18nKey, params?: InterpolationParams): string {
    return this.i18n.t(key, params);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
