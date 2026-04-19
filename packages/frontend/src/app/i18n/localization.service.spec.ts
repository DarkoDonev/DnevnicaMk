import {TestBed} from '@angular/core/testing';

import {LocalizationService} from './localization.service';
import {TRANSLATIONS, translateForLanguage} from './translations';

const STORAGE_KEY = 'dnevnicamk.lang';

describe('LocalizationService', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.lang = '';
    TestBed.resetTestingModule();
  });

  function createService(): LocalizationService {
    TestBed.configureTestingModule({});
    return TestBed.inject(LocalizationService);
  }

  it('defaults to Macedonian (mk) on first load', () => {
    const service = createService();

    expect(service.currentLanguage).toBe('mk');
    expect(service.currentDateLocale).toBe('mk-MK');
    expect(service.currentMaterialLocale).toBe('mk');
    expect(document.documentElement.lang).toBe('mk');
  });

  it('reads persisted language from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'en');

    const service = createService();

    expect(service.currentLanguage).toBe('en');
    expect(service.currentDateLocale).toBe('en-GB');
    expect(service.currentMaterialLocale).toBe('en-GB');
    expect(document.documentElement.lang).toBe('en');
  });

  it('switches language and persists it', () => {
    const service = createService();
    const seen: string[] = [];
    const subscription = service.language$.subscribe((value) => seen.push(value));

    service.setLanguage('en');

    expect(service.currentLanguage).toBe('en');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(seen).toEqual(['mk', 'en']);

    subscription.unsubscribe();
  });

  it('interpolates values in translated strings', () => {
    const service = createService();
    service.setLanguage('en');

    expect(service.t('Approved {name}.', {name: 'Acme'})).toBe('Approved Acme.');
  });

  it('falls back to English when selected-language value is missing', () => {
    const languageKey = 'Language';
    const backup = (TRANSLATIONS.mk as any)[languageKey];

    (TRANSLATIONS.mk as any)[languageKey] = undefined;
    try {
      expect(translateForLanguage('mk', languageKey)).toBe('Language');
    } finally {
      (TRANSLATIONS.mk as any)[languageKey] = backup;
    }
  });

  it('falls back to key when missing in both dictionaries', () => {
    const unknownKey = '__unknown_localization_key__';
    expect(translateForLanguage('mk', unknownKey as any)).toBe(unknownKey);
  });
});
