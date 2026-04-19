import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

import {I18nKey, InterpolationParams, LanguageCode, translateForLanguage} from './translations';

const STORAGE_KEY = 'dnevnicamk.lang';

@Injectable({providedIn: 'root'})
export class LocalizationService {
  private readonly languageSubject = new BehaviorSubject<LanguageCode>(this.readInitialLanguage());

  readonly language$ = this.languageSubject.asObservable();

  constructor() {
    this.syncDocumentLanguage(this.languageSubject.value);
  }

  get currentLanguage(): LanguageCode {
    return this.languageSubject.value;
  }

  get currentDateLocale(): string {
    return this.currentLanguage === 'mk' ? 'mk-MK' : 'en-GB';
  }

  get currentMaterialLocale(): string {
    return this.currentLanguage === 'mk' ? 'mk' : 'en-GB';
  }

  setLanguage(language: LanguageCode): void {
    if (language === this.languageSubject.value) return;

    this.languageSubject.next(language);
    this.syncDocumentLanguage(language);

    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Ignore browser storage failures and keep runtime state only.
    }
  }

  t(key: I18nKey, params?: InterpolationParams): string {
    return translateForLanguage(this.currentLanguage, key, params);
  }

  private readInitialLanguage(): LanguageCode {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'mk' || raw === 'en') return raw;
    } catch {
      // Ignore storage read errors.
    }

    return 'mk';
  }

  private syncDocumentLanguage(language: LanguageCode): void {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
  }
}
